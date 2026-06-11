import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeCohesion, simulateMatch } from '@/lib/battle-engine'
import type { Card } from '@/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerIds, coachId } = await req.json() as { playerIds: string[]; coachId: string }

  if (!Array.isArray(playerIds) || playerIds.length !== 3 || !coachId) {
    return NextResponse.json({ error: '3 joueurs + 1 coach requis' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.phase !== 'team_selection') return NextResponse.json({ error: 'Phase incorrecte' }, { status: 400 })

  const isChallenger = battle.challenger_id === user.id
  const isOpponent = battle.opponent_id === user.id
  if (!isChallenger && !isOpponent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Déjà soumis
  const existingTeam = isChallenger ? battle.challenger_team : battle.opponent_team
  if (existingTeam) return NextResponse.json({ error: 'Équipe déjà sélectionnée' }, { status: 400 })

  // Vérifier possession des 4 cartes
  const allCardIds = [...playerIds, coachId]
  const { data: owned } = await admin
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user.id)
    .in('card_id', allCardIds)

  const ownedSet = new Set((owned ?? []).map((uc) => uc.card_id))
  if (!allCardIds.every((id) => ownedSet.has(id))) {
    return NextResponse.json({ error: 'Cartes non possédées' }, { status: 400 })
  }

  // Détails des cartes
  const { data: cards } = await admin.from('cards').select('*').in('id', allCardIds)
  if (!cards || cards.length !== 4) return NextResponse.json({ error: 'Cartes introuvables' }, { status: 400 })

  const playerCards = playerIds.map((id) => cards.find((c) => c.id === id)).filter(Boolean) as Card[]
  const coachCard = cards.find((c) => c.id === coachId) as Card
  const team = { players: playerCards, coach: coachCard }

  const updateField = isChallenger ? 'challenger_team' : 'opponent_team'
  await admin.from('battles').update({ [updateField]: team }).eq('id', battleId)

  // Re-fetch pour voir si l'adversaire a déjà soumis
  const { data: updated } = await admin
    .from('battles')
    .select('challenger_team, opponent_team, challenger_id, opponent_id')
    .eq('id', battleId)
    .single()

  const challengerTeam = (isChallenger ? team : updated?.challenger_team) as { players: Card[]; coach: Card } | null
  const opponentTeam = (!isChallenger ? team : updated?.opponent_team) as { players: Card[]; coach: Card } | null

  // Les deux équipes sont prêtes → simuler le match
  if (challengerTeam && opponentTeam) {
    const homeCohesion = computeCohesion(challengerTeam)
    const awayCohesion = computeCohesion(opponentTeam)
    const { events, homeGoals, awayGoals } = simulateMatch(
      homeCohesion,
      awayCohesion,
      challengerTeam.players,
      opponentTeam.players,
      battleId,
    )

    const winnerId = homeGoals > awayGoals
      ? battle.challenger_id
      : awayGoals > homeGoals
        ? battle.opponent_id
        : null  // Nul : pas de vainqueur

    // Démarrage synchronisé 2s après pour que les deux clients reçoivent le Realtime
    const matchStartAt = new Date(Date.now() + 2000).toISOString()

    await admin.from('battles').update({
      challenger_cohesion: homeCohesion,
      opponent_cohesion: awayCohesion,
      match_events: events,
      final_score: { home: homeGoals, away: awayGoals },
      winner_id: winnerId,
      match_start_at: matchStartAt,
      phase: 'match_ready',
    }).eq('id', battleId)
  }

  return NextResponse.json({ success: true })
}
