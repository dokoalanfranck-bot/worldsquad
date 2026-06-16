import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Direction = 'left' | 'center' | 'right' | 'panenka'

function getCardPower(stats: Record<string, number | string>): number {
  const nums = Object.values(stats).filter((v): v is number => typeof v === 'number')
  if (nums.length === 0) return 70
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function resolveShot(
  shooterChoice: Direction,
  gkChoice: Direction,
  shooterPower: number,
  gkPower: number
): boolean {
  const statAdj = ((shooterPower - gkPower) / 200) * 0.15

  if (shooterChoice === 'panenka') {
    const base = gkChoice === 'center' ? 0.05 : 0.95
    return Math.random() < Math.min(0.97, Math.max(0.03, base + statAdj))
  }

  const sameDir = shooterChoice === gkChoice
  const base = sameDir ? 0.15 : 0.85
  return Math.random() < Math.min(0.95, Math.max(0.05, base + statAdj))
}

function isShooter(round: number, userId: string, challengerId: string): boolean {
  return round % 2 === 1 ? userId === challengerId : userId !== challengerId
}

function checkGameOver(
  round: number,
  cScore: number,
  oScore: number,
  challengerId: string,
  opponentId: string
): { over: boolean; winnerId: string | null } {
  if (round <= 6) {
    const cTaken = Math.ceil(round / 2)
    const oTaken = Math.floor(round / 2)
    const cLeft = 3 - cTaken
    const oLeft = 3 - oTaken

    if (cScore > oScore + oLeft) return { over: true, winnerId: challengerId }
    if (oScore > cScore + cLeft) return { over: true, winnerId: opponentId }

    if (round === 6) {
      if (cScore !== oScore) {
        return { over: true, winnerId: cScore > oScore ? challengerId : opponentId }
      }
    }
    return { over: false, winnerId: null }
  }

  // Mort subite: après chaque round pair, vérifier
  if (round % 2 === 0) {
    if (cScore !== oScore) {
      return { over: true, winnerId: cScore > oScore ? challengerId : opponentId }
    }
  }
  // Max 10 rounds
  if (round >= 10) {
    if (cScore > oScore) return { over: true, winnerId: challengerId }
    if (oScore > cScore) return { over: true, winnerId: opponentId }
    return { over: true, winnerId: challengerId } // tiebreaker
  }
  return { over: false, winnerId: null }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json() as { choice: Direction }
  const { choice } = body
  if (!['left', 'center', 'right', 'panenka'].includes(choice)) {
    return NextResponse.json({ error: 'Choix invalide' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('penalty_battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.status !== 'active') return NextResponse.json({ error: 'Battle non active' }, { status: 400 })
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isChallenger = user.id === battle.challenger_id
  const userIsShooter = isShooter(battle.current_round, user.id, battle.challenger_id)

  // Panenka validation
  if (choice === 'panenka') {
    if (!userIsShooter) return NextResponse.json({ error: 'Panenka réservé au tireur' }, { status: 400 })
    if (isChallenger && battle.challenger_used_panenka) {
      return NextResponse.json({ error: 'Panenka déjà utilisée' }, { status: 400 })
    }
    if (!isChallenger && battle.opponent_used_panenka) {
      return NextResponse.json({ error: 'Panenka déjà utilisée' }, { status: 400 })
    }
  }

  // Insert choice (UNIQUE constraint prevents double submit)
  const { error: insertErr } = await admin
    .from('penalty_choices')
    .insert({
      battle_id: battleId,
      round_number: battle.current_round,
      player_id: user.id,
      choice,
    })

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ submitted: true, resolved: false, alreadySubmitted: true })
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Check if both players have submitted
  const { data: allChoices } = await admin
    .from('penalty_choices')
    .select('player_id, choice')
    .eq('battle_id', battleId)
    .eq('round_number', battle.current_round)

  const deadlinePassed = battle.round_deadline
    ? new Date() > new Date(battle.round_deadline)
    : false

  const needsAutoFill = (allChoices?.length ?? 0) < 2 && deadlinePassed
  if ((allChoices?.length ?? 0) < 2 && !deadlinePassed) {
    return NextResponse.json({ submitted: true, resolved: false })
  }

  // Auto-fill missing player if deadline passed
  if (needsAutoFill) {
    const submittedIds = new Set((allChoices ?? []).map((c) => c.player_id))
    const missingId = submittedIds.has(battle.challenger_id)
      ? battle.opponent_id
      : battle.challenger_id
    const randomChoice = (['left', 'center', 'right'] as const)[Math.floor(Math.random() * 3)]
    await admin.from('penalty_choices').upsert({
      battle_id: battleId,
      round_number: battle.current_round,
      player_id: missingId,
      choice: randomChoice,
    }, { onConflict: 'battle_id,round_number,player_id', ignoreDuplicates: true })
  }

  // Reload choices (may have just inserted auto-fill)
  const { data: finalChoices } = await admin
    .from('penalty_choices')
    .select('player_id, choice')
    .eq('battle_id', battleId)
    .eq('round_number', battle.current_round)

  if (!finalChoices || finalChoices.length < 2) {
    return NextResponse.json({ submitted: true, resolved: false })
  }

  const choiceMap = new Map(finalChoices.map((c) => [c.player_id, c.choice as Direction]))

  // Determine shooter and GK for this round
  const shooterId = battle.current_round % 2 === 1 ? battle.challenger_id : battle.opponent_id
  const gkId = shooterId === battle.challenger_id ? battle.opponent_id : battle.challenger_id

  const shooterChoice = choiceMap.get(shooterId)!
  const gkChoice = (choiceMap.get(gkId) ?? 'left') as Direction

  // Load wager cards for stat calc
  async function getPower(userCardId: string | null): Promise<number> {
    if (!userCardId) return 70
    const { data } = await admin
      .from('user_cards')
      .select('card:cards(stats)')
      .eq('id', userCardId)
      .maybeSingle()
    if (!data?.card) return 70
    return getCardPower((data.card as unknown as { stats: Record<string, number | string> }).stats)
  }

  const [shooterPower, gkPower] = await Promise.all([
    getPower(shooterId === battle.challenger_id ? battle.challenger_wager : battle.opponent_wager),
    getPower(gkId === battle.challenger_id ? battle.challenger_wager : battle.opponent_wager),
  ])

  const isGoal = resolveShot(shooterChoice, gkChoice, shooterPower, gkPower)

  const newCScore = battle.challenger_score + (isGoal && shooterId === battle.challenger_id ? 1 : 0)
  const newOScore = battle.opponent_score + (isGoal && shooterId === battle.opponent_id ? 1 : 0)

  const roundResult = {
    round: battle.current_round,
    shooter_id: shooterId,
    gk_id: gkId,
    shooter_choice: shooterChoice,
    gk_choice: gkChoice,
    is_goal: isGoal,
    shooter_power: Math.round(shooterPower),
    gk_power: Math.round(gkPower),
  }

  const newRounds = [...((battle.rounds as unknown[]) ?? []), roundResult]
  const { over, winnerId } = checkGameOver(
    battle.current_round,
    newCScore,
    newOScore,
    battle.challenger_id,
    battle.opponent_id!
  )

  const panenkaUpdate: Record<string, boolean> = {}
  if (shooterChoice === 'panenka') {
    if (shooterId === battle.challenger_id) panenkaUpdate.challenger_used_panenka = true
    else panenkaUpdate.opponent_used_panenka = true
  }

  const nextRound = battle.current_round + 1
  const nextDeadline = over ? null : new Date(Date.now() + 5000).toISOString()

  // Atomic update — optimistic lock on current_round
  const { data: updated } = await admin
    .from('penalty_battles')
    .update({
      current_round: nextRound,
      challenger_score: newCScore,
      opponent_score: newOScore,
      rounds: newRounds,
      round_deadline: nextDeadline,
      winner_id: winnerId ?? null,
      status: over ? 'finished' : 'active',
      ...panenkaUpdate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', battleId)
    .eq('current_round', battle.current_round) // optimistic lock
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ submitted: true, resolved: false })
  }

  // Transfer card when game over
  if (over && winnerId) {
    const loserId = winnerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id
    const loserWager = winnerId === battle.challenger_id ? battle.opponent_wager : battle.challenger_wager

    if (loserWager && loserId) {
      await admin
        .from('user_cards')
        .update({ user_id: winnerId, obtained_via: 'penalty_battle' })
        .eq('id', loserWager)
        .eq('user_id', loserId)
    }

    // Update battle stats
    const [{ data: winnerProfile }, { data: loserProfile }] = await Promise.all([
      admin.from('users').select('battles_won, battles_played').eq('id', winnerId).single(),
      admin.from('users').select('battles_played').eq('id', loserId!).single(),
    ])
    await Promise.all([
      admin.from('users').update({
        battles_won: (winnerProfile?.battles_won ?? 0) + 1,
        battles_played: (winnerProfile?.battles_played ?? 0) + 1,
      }).eq('id', winnerId),
      admin.from('users').update({
        battles_played: (loserProfile?.battles_played ?? 0) + 1,
      }).eq('id', loserId!),
    ])
  }

  return NextResponse.json({ submitted: true, resolved: true, isGoal, roundResult })
}
