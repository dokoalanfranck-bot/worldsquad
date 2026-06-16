import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Direction = 'left' | 'center' | 'right' | 'panenka'
type PickEntry = { id: string; stats: Record<string, number | string> }

function getCardPower(stats: Record<string, number | string>): number {
  const nums = Object.values(stats).filter((v): v is number => typeof v === 'number')
  if (nums.length === 0) return 70
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function getPickPower(picks: PickEntry[] | null, idx: number): number {
  if (!picks || !picks[idx]?.stats) return 70
  return getCardPower(picks[idx].stats)
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

function checkGameOver(
  round: number, cScore: number, oScore: number,
  challengerId: string, opponentId: string
): { over: boolean; winnerId: string | null } {
  if (round <= 6) {
    const cTaken = Math.ceil(round / 2)
    const oTaken = Math.floor(round / 2)
    const cLeft = 3 - cTaken
    const oLeft = 3 - oTaken
    if (cScore > oScore + oLeft) return { over: true, winnerId: challengerId }
    if (oScore > cScore + cLeft) return { over: true, winnerId: opponentId }
    if (round === 6 && cScore !== oScore) {
      return { over: true, winnerId: cScore > oScore ? challengerId : opponentId }
    }
    return { over: false, winnerId: null }
  }
  if (round % 2 === 0 && cScore !== oScore) {
    return { over: true, winnerId: cScore > oScore ? challengerId : opponentId }
  }
  if (round >= 10) {
    if (cScore > oScore) return { over: true, winnerId: challengerId }
    if (oScore > cScore) return { over: true, winnerId: opponentId }
    return { over: true, winnerId: challengerId }
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

  const { choice } = await req.json() as { choice: Direction }
  if (!['left', 'center', 'right', 'panenka'].includes(choice)) {
    return NextResponse.json({ error: 'Choix invalide' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: battle } = await admin.from('penalty_battles').select('*').eq('id', battleId).single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.status !== 'active') return NextResponse.json({ error: 'Battle non active' }, { status: 400 })
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isChallenger = user.id === battle.challenger_id
  const shooterId = battle.current_round % 2 === 1 ? battle.challenger_id : battle.opponent_id
  const userIsShooter = shooterId === user.id

  if (choice === 'panenka') {
    if (!userIsShooter) return NextResponse.json({ error: 'Panenka réservé au tireur' }, { status: 400 })
    if (isChallenger && battle.challenger_used_panenka) return NextResponse.json({ error: 'Panenka déjà utilisée' }, { status: 400 })
    if (!isChallenger && battle.opponent_used_panenka) return NextResponse.json({ error: 'Panenka déjà utilisée' }, { status: 400 })
  }

  const { error: insertErr } = await admin.from('penalty_choices').insert({
    battle_id: battleId,
    round_number: battle.current_round,
    player_id: user.id,
    choice,
  })

  if (insertErr) {
    if (insertErr.code === '23505') return NextResponse.json({ submitted: true, resolved: false, alreadySubmitted: true })
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const { data: allChoices } = await admin
    .from('penalty_choices')
    .select('player_id, choice')
    .eq('battle_id', battleId)
    .eq('round_number', battle.current_round)

  const deadlinePassed = battle.round_deadline ? new Date() > new Date(battle.round_deadline) : false

  if ((allChoices?.length ?? 0) < 2 && !deadlinePassed) {
    return NextResponse.json({ submitted: true, resolved: false })
  }

  // Auto-fill missing player if deadline passed
  if ((allChoices?.length ?? 0) < 2 && deadlinePassed) {
    const submittedIds = new Set((allChoices ?? []).map((c) => c.player_id))
    const missingId = submittedIds.has(battle.challenger_id) ? battle.opponent_id : battle.challenger_id
    const randomChoice = (['left', 'center', 'right'] as const)[Math.floor(Math.random() * 3)]
    await admin.from('penalty_choices').upsert({
      battle_id: battleId, round_number: battle.current_round,
      player_id: missingId, choice: randomChoice,
    }, { onConflict: 'battle_id,round_number,player_id', ignoreDuplicates: true })
  }

  const { data: finalChoices } = await admin
    .from('penalty_choices').select('player_id, choice')
    .eq('battle_id', battleId).eq('round_number', battle.current_round)

  if (!finalChoices || finalChoices.length < 2) {
    return NextResponse.json({ submitted: true, resolved: false })
  }

  const choiceMap = new Map(finalChoices.map((c) => [c.player_id, c.choice as Direction]))
  const gkId = shooterId === battle.challenger_id ? battle.opponent_id : battle.challenger_id

  const shooterChoice = choiceMap.get(shooterId)!
  const gkChoice = (choiceMap.get(gkId) ?? 'left') as Direction

  // Use picks for stat calculation
  const shooterPickIdx = Math.floor((battle.current_round - 1) / 2) % 3
  const gkPickIdx = 3

  const shooterPicks = (shooterId === battle.challenger_id
    ? battle.challenger_picks
    : battle.opponent_picks) as PickEntry[] | null
  const gkPicks = (gkId === battle.challenger_id
    ? battle.challenger_picks
    : battle.opponent_picks) as PickEntry[] | null

  const shooterPower = getPickPower(shooterPicks, shooterPickIdx)
  const gkPower = getPickPower(gkPicks, gkPickIdx)

  const isGoal = resolveShot(shooterChoice, gkChoice, shooterPower, gkPower)

  const newCScore = battle.challenger_score + (isGoal && shooterId === battle.challenger_id ? 1 : 0)
  const newOScore = battle.opponent_score + (isGoal && shooterId === battle.opponent_id ? 1 : 0)

  const roundResult = {
    round: battle.current_round, shooter_id: shooterId, gk_id: gkId,
    shooter_choice: shooterChoice, gk_choice: gkChoice, is_goal: isGoal,
    shooter_power: Math.round(shooterPower), gk_power: Math.round(gkPower),
  }

  const newRounds = [...((battle.rounds as unknown[]) ?? []), roundResult]
  const { over, winnerId } = checkGameOver(
    battle.current_round, newCScore, newOScore, battle.challenger_id, battle.opponent_id!
  )

  const panenkaUpdate: Record<string, boolean> = {}
  if (shooterChoice === 'panenka') {
    if (shooterId === battle.challenger_id) panenkaUpdate.challenger_used_panenka = true
    else panenkaUpdate.opponent_used_panenka = true
  }

  const nextRound = battle.current_round + 1
  const nextDeadline = over ? null : new Date(Date.now() + 15000).toISOString()

  const { data: updated } = await admin
    .from('penalty_battles')
    .update({
      current_round: nextRound,
      challenger_score: newCScore,
      opponent_score: newOScore,
      rounds: newRounds,
      round_deadline: nextDeadline,
      winner_id: winnerId ?? null,
      status: over ? 'stealing' : 'active',
      ...panenkaUpdate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', battleId)
    .eq('current_round', battle.current_round)
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ submitted: true, resolved: false })
  }

  return NextResponse.json({ submitted: true, resolved: true, isGoal, roundResult })
}
