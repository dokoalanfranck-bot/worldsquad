import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

const ROUND_PHASES = ['round_1', 'round_2', 'round_3'] as const
type RoundPhase = typeof ROUND_PHASES[number]

const STAT_LABELS: Record<string, string> = {
  pace: 'PAC', shooting: 'TIR', passing: 'PAS',
  defending: 'DEF', dribbling: 'DRI', physical: 'PHY',
}

function pickRoundStat(available: string[], usedStats: string[]): string {
  const remaining = available.filter((s) => !usedStats.includes(s))
  const pool = remaining.length > 0 ? remaining : available
  return pool[Math.floor(Math.random() * pool.length)]
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { cardId } = await req.json() as { cardId: string }
  if (!cardId) return NextResponse.json({ error: 'cardId requis' }, { status: 400 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('*, challenger_draft, opponent_draft, available_stats, round_picks, rounds, current_round')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })

  const phase = battle.phase as RoundPhase
  if (!ROUND_PHASES.includes(phase)) return NextResponse.json({ error: 'Pas en phase de round' }, { status: 400 })

  const isChallenger = battle.challenger_id === user.id
  const isOpponent = battle.opponent_id === user.id
  if (!isChallenger && !isOpponent) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const roundKey = phase // 'round_1', 'round_2', 'round_3'
  const roundPicks = (battle.round_picks ?? {}) as Record<string, { challenger?: string; opponent?: string; stat?: string }>
  const thisPick = roundPicks[roundKey] ?? {}

  // Already picked this round?
  if (isChallenger && thisPick.challenger) return NextResponse.json({ error: 'Déjà joué ce round' }, { status: 400 })
  if (isOpponent && thisPick.opponent) return NextResponse.json({ error: 'Déjà joué ce round' }, { status: 400 })

  // Validate card is in user's draft
  const myDraft = (isChallenger ? battle.challenger_draft : battle.opponent_draft) as { id: string }[] | null
  if (!myDraft || !myDraft.find((c) => c.id === cardId)) {
    return NextResponse.json({ error: 'Carte non disponible dans ton draft' }, { status: 400 })
  }

  // Check card not used in previous rounds
  const usedByMe: string[] = []
  for (const rk of ROUND_PHASES) {
    if (rk === roundKey) break
    const rp = roundPicks[rk]
    if (rp) usedByMe.push(isChallenger ? (rp.challenger ?? '') : (rp.opponent ?? ''))
  }
  if (usedByMe.includes(cardId)) {
    return NextResponse.json({ error: 'Cette carte a déjà été utilisée' }, { status: 400 })
  }

  // Assign a stat for this round if not yet assigned
  const existingStat = thisPick.stat
  const availableStats = (battle.available_stats ?? ['pace', 'shooting', 'passing', 'defending']) as string[]
  const usedStats = ROUND_PHASES
    .filter((rk) => roundPicks[rk]?.stat)
    .map((rk) => roundPicks[rk].stat!)
  const roundStat = existingStat ?? pickRoundStat(availableStats, usedStats)

  // Save pick
  const newPick = { ...thisPick, stat: roundStat, [isChallenger ? 'challenger' : 'opponent']: cardId }
  const newRoundPicks = { ...roundPicks, [roundKey]: newPick }

  const bothPicked = newPick.challenger && newPick.opponent

  if (!bothPicked) {
    await admin.from('battles').update({ round_picks: newRoundPicks }).eq('id', battleId)
    return NextResponse.json({ success: true, waiting: true })
  }

  // ── Both picked — resolve round ──────────────────────────────────────────
  const challengerCard = (battle.challenger_draft as { id: string; stats: Record<string, number | string> }[])
    .find((c) => c.id === newPick.challenger)!
  const opponentCard = (battle.opponent_draft as { id: string; stats: Record<string, number | string> }[])
    .find((c) => c.id === newPick.opponent)!

  const cv = Number(challengerCard?.stats?.[roundStat] ?? 0)
  const ov = Number(opponentCard?.stats?.[roundStat] ?? 0)
  const roundWinner = cv > ov ? 'challenger' : ov > cv ? 'opponent' : 'tie'

  const prevRounds = (battle.rounds ?? []) as object[]
  const newRounds = [
    ...prevRounds,
    {
      round: ROUND_PHASES.indexOf(phase) + 1,
      stat: roundStat,
      label: STAT_LABELS[roundStat] ?? roundStat,
      challenger_card: { id: challengerCard?.id, name: (challengerCard as { name?: string })?.name },
      opponent_card: { id: opponentCard?.id, name: (opponentCard as { name?: string })?.name },
      challenger_val: cv,
      opponent_val: ov,
      winner: roundWinner,
    },
  ]

  // Determine next phase
  const roundIndex = ROUND_PHASES.indexOf(phase)
  const nextPhase = roundIndex < 2 ? ROUND_PHASES[roundIndex + 1] : null

  // If all 3 rounds done — find overall winner
  let overallWinnerId: string | null = null
  let finalPhase = nextPhase ?? 'pick_reward'

  if (!nextPhase) {
    const challWins = newRounds.filter((r) => (r as { winner: string }).winner === 'challenger').length
    const oppWins = newRounds.filter((r) => (r as { winner: string }).winner === 'opponent').length
    overallWinnerId = challWins >= oppWins ? battle.challenger_id : battle.opponent_id
    finalPhase = 'pick_reward'
  }

  const update: Record<string, unknown> = {
    round_picks: newRoundPicks,
    rounds: newRounds,
    phase: finalPhase,
  }
  if (overallWinnerId) update.winner_id = overallWinnerId

  await admin.from('battles').update(update).eq('id', battleId)

  // Notify if entering pick_reward phase
  if (finalPhase === 'pick_reward' && overallWinnerId) {
    const loserId = overallWinnerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id
    await Promise.allSettled([
      sendPushToUser(overallWinnerId, {
        title: '🏆 Victoire ! Choisis ta récompense',
        body: 'Tu as gagné le Draft Duel — choisis une carte adverse à récupérer !',
        tag: 'battle-result',
        url: `/battles/${battleId}/play`,
      }),
      sendPushToUser(loserId, {
        title: '💔 Défaite au Draft Duel',
        body: 'Ton adversaire va choisir une de tes cartes…',
        tag: 'battle-result',
        url: `/battles/${battleId}/play`,
      }),
    ])
  }

  return NextResponse.json({ success: true, resolved: true, phase: finalPhase })
}
