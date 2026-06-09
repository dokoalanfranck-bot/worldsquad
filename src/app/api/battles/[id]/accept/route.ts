import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

const BATTLE_STATS = ['pace', 'shooting', 'passing', 'defending', 'dribbling', 'physical'] as const
type StatKey = typeof BATTLE_STATS[number]

const STAT_LABELS: Record<StatKey, string> = {
  pace: 'PAC', shooting: 'TIR', passing: 'PAS',
  defending: 'DEF', dribbling: 'DRI', physical: 'PHY',
}

function pickRoundStats(): StatKey[] {
  const shuffled = [...BATTLE_STATS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3) as StatKey[]
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { cardId } = await req.json()
  if (!cardId) return NextResponse.json({ error: 'cardId requis' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch battle + both cards
  const { data: battle, error: fetchErr } = await admin
    .from('battles')
    .select(`
      *,
      challenger_card:cards!battles_challenger_card_id_fkey(*),
      challenger:users!battles_challenger_id_fkey(id, pseudo, coins)
    `)
    .eq('id', battleId)
    .single()

  if (fetchErr || !battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.opponent_id !== user.id) return NextResponse.json({ error: 'Pas ton battle' }, { status: 403 })
  if (battle.status !== 'pending') return NextResponse.json({ error: 'Battle déjà résolu' }, { status: 400 })

  // Fetch opponent's chosen card
  const { data: opponentCard } = await admin.from('cards').select('*').eq('id', cardId).single()
  if (!opponentCard) return NextResponse.json({ error: 'Carte invalide' }, { status: 400 })

  // Verify opponent owns this card
  const { data: ownership } = await admin
    .from('user_cards')
    .select('id')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .single()
  if (!ownership) return NextResponse.json({ error: 'Tu ne possèdes pas cette carte' }, { status: 403 })

  const challengerCard = battle.challenger_card
  if (!challengerCard) return NextResponse.json({ error: 'Carte challenger manquante' }, { status: 400 })

  // ── Resolve Battle ──────────────────────────────────────────────────────────
  const roundStats = pickRoundStats()
  const rounds = roundStats.map((stat) => {
    const cv = Number(challengerCard.stats?.[stat] ?? 0)
    const ov = Number(opponentCard.stats?.[stat] ?? 0)
    const winner = cv > ov ? 'challenger' : ov > cv ? 'opponent' : 'tie'
    return { stat, label: STAT_LABELS[stat], challenger_val: cv, opponent_val: ov, winner }
  })

  const challengerRoundWins = rounds.filter((r) => r.winner === 'challenger').length
  const opponentRoundWins = rounds.filter((r) => r.winner === 'opponent').length
  const overallWinner: 'challenger' | 'opponent' | 'tie' =
    challengerRoundWins > opponentRoundWins ? 'challenger'
    : opponentRoundWins > challengerRoundWins ? 'opponent'
    : 'tie' // tie: challenger wins (home advantage)

  const winnerId = overallWinner === 'challenger' ? battle.challenger_id
    : overallWinner === 'opponent' ? user.id
    : battle.challenger_id

  const resultSummary = `${challengerRoundWins}-${opponentRoundWins} (${rounds.map((r) => r.label).join(', ')})`

  // ── Update battle ───────────────────────────────────────────────────────────
  await admin.from('battles').update({
    status: 'finished',
    opponent_card_id: cardId,
    winner_id: winnerId,
    rounds,
    stat_compared: rounds[0].label,
    result_summary: resultSummary,
  }).eq('id', battleId)

  // ── Transfer coins ──────────────────────────────────────────────────────────
  const stake = battle.coins_stake
  const loserId = winnerId === battle.challenger_id ? user.id : battle.challenger_id

  await admin.rpc('increment_coins', { user_id: winnerId, delta: stake })
  await admin.rpc('increment_coins', { user_id: loserId, delta: -stake })

  await admin.from('coin_transactions').insert([
    { user_id: winnerId, amount: stake, reason: `Victoire battle — +${stake} coins` },
    { user_id: loserId, amount: -stake, reason: `Défaite battle — -${stake} coins` },
  ])

  // ── Update streaks ──────────────────────────────────────────────────────────
  // Winner: increment streak
  const { data: winnerProfile } = await admin.from('users').select('battle_streak, best_streak, battles_won, battles_played').eq('id', winnerId).single()
  if (winnerProfile) {
    const newStreak = (winnerProfile.battle_streak ?? 0) + 1
    await admin.from('users').update({
      battle_streak: newStreak,
      best_streak: Math.max(newStreak, winnerProfile.best_streak ?? 0),
      battles_won: (winnerProfile.battles_won ?? 0) + 1,
      battles_played: (winnerProfile.battles_played ?? 0) + 1,
    }).eq('id', winnerId)
  }
  // Loser: reset streak
  const { data: loserProfile } = await admin.from('users').select('battles_played').eq('id', loserId).single()
  if (loserProfile) {
    await admin.from('users').update({
      battle_streak: 0,
      battles_played: (loserProfile.battles_played ?? 0) + 1,
    }).eq('id', loserId)
  }

  // ── Group activity ──────────────────────────────────────────────────────────
  const { data: membership } = await admin
    .from('group_members').select('group_id').eq('user_id', user.id).single()
  if (membership) {
    const { data: opponentProfile } = await admin.from('users').select('pseudo').eq('id', user.id).single()
    await admin.from('group_activities').insert({
      group_id: membership.group_id,
      user_id: winnerId,
      activity_type: 'battle_result',
      message: `a remporté un battle ${challengerRoundWins}-${opponentRoundWins} pour ${stake} coins ⚔️🏆`,
    })
    void opponentProfile
  }

  // ── Push notifications ──────────────────────────────────────────────────────
  const winnerIsChallenger = winnerId === battle.challenger_id
  const notifForChallenger = {
    title: winnerIsChallenger ? '🏆 Tu as gagné le battle !' : '💔 Tu as perdu le battle',
    body: winnerIsChallenger
      ? `Victoire ${challengerRoundWins}-${opponentRoundWins} ! +${stake} coins remportés`
      : `Défaite ${challengerRoundWins}-${opponentRoundWins}. -${stake} coins perdus`,
    tag: 'battle-result',
    url: `/battles/${battleId}`,
  }
  const notifForOpponent = {
    title: !winnerIsChallenger ? '🏆 Tu as gagné le battle !' : '💔 Tu as perdu le battle',
    body: !winnerIsChallenger
      ? `Victoire ${opponentRoundWins}-${challengerRoundWins} ! +${stake} coins remportés`
      : `Défaite ${opponentRoundWins}-${challengerRoundWins}. -${stake} coins perdus`,
    tag: 'battle-result',
    url: `/battles/${battleId}`,
  }

  await Promise.allSettled([
    sendPushToUser(battle.challenger_id, notifForChallenger),
    sendPushToUser(user.id, notifForOpponent),
  ])

  return NextResponse.json({ success: true, rounds, winnerId, battleId })
}
