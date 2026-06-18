import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { simulateDuel } from '@/lib/duel-engine'
import { completeMission } from '@/lib/missions'
import type { Card } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { playerIds, gkId, coachId } = await req.json() as {
    playerIds: string[]
    gkId: string
    coachId: string
  }

  if (!Array.isArray(playerIds) || playerIds.length !== 4 || !gkId || !coachId) {
    return NextResponse.json({ error: '4 joueurs + 1 GK + 1 coach requis' }, { status: 400 })
  }

  // Ensure all 6 card IDs are distinct
  const allIdSet = new Set([...playerIds, gkId, coachId])
  if (allIdSet.size !== 6) {
    return NextResponse.json({ error: 'Cartes en double détectées' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: duel } = await admin
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single()

  if (!duel) return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })
  if (duel.status !== 'picking') return NextResponse.json({ error: 'Phase incorrecte' }, { status: 400 })

  const isChallenger = duel.challenger_id === user.id
  const isOpponent   = duel.opponent_id   === user.id
  if (!isChallenger && !isOpponent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isChallenger && duel.challenger_picks) return NextResponse.json({ error: 'Déjà soumis' }, { status: 400 })
  if (isOpponent   && duel.opponent_picks)   return NextResponse.json({ error: 'Déjà soumis' }, { status: 400 })

  // Verify ownership of all 6 cards
  const allIds = [...playerIds, gkId, coachId]
  const { data: owned } = await admin
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user.id)
    .in('card_id', allIds)

  const ownedSet = new Set((owned ?? []).map((r) => r.card_id))
  if (!allIds.every((id) => ownedSet.has(id))) {
    return NextResponse.json({ error: 'Cartes non possédées' }, { status: 400 })
  }

  // Fetch card details in pick order (field players first, then GK, then coach)
  const { data: cardsRaw } = await admin.from('cards').select('*').in('id', allIds)
  if (!cardsRaw || cardsRaw.length !== 6) {
    return NextResponse.json({ error: 'Cartes introuvables' }, { status: 400 })
  }

  const myPicks = allIds.map((id) => cardsRaw.find((c) => c.id === id)).filter(Boolean) as Card[]
  const pickField = isChallenger ? 'challenger_picks' : 'opponent_picks'

  const { error: saveErr } = await admin.from('duels').update({ [pickField]: myPicks }).eq('id', duelId)
  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 })

  // Re-fetch to see if both picks are ready
  const { data: fresh } = await admin.from('duels').select('*').eq('id', duelId).single()
  if (!fresh) return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })

  const challengerPicks = (isChallenger ? myPicks : fresh.challenger_picks) as Card[] | null
  const opponentPicks   = (!isChallenger ? myPicks : fresh.opponent_picks)   as Card[] | null

  if (challengerPicks && opponentPicks) {
    const { events, challengerScore, opponentScore } = simulateDuel(challengerPicks, opponentPicks, duelId)

    const challId = duel.challenger_id
    const oppId   = duel.opponent_id as string | null
    const botWon  = !!duel.is_bot && opponentScore > challengerScore

    let winnerId: string | null = challengerScore > opponentScore
      ? challId
      : opponentScore > challengerScore && oppId
        ? oppId
        : null

    // Tournoi + égalité → tirs au but automatiques
    if (!winnerId && !botWon && duel.tournament_id) {
      if (duel.is_bot) {
        winnerId = challId
      } else if (duel.opponent_id) {
        const challPenPicks = [challengerPicks[0], challengerPicks[1], challengerPicks[2], challengerPicks[4]]
        const oppPenPicks   = [opponentPicks[0],   opponentPicks[1],   opponentPicks[2],   opponentPicks[4]]
        const { data: pb, error: pbErr } = await admin.from('penalty_battles').insert({
          challenger_id:      duel.challenger_id,
          opponent_id:        duel.opponent_id,
          status:             'active',
          challenger_picks:   challPenPicks,
          opponent_picks:     oppPenPicks,
          round_deadline:     new Date(Date.now() + 15000).toISOString(),
          stake_count:        0,
          tournament_duel_id: duelId,
          tournament_id:      duel.tournament_id,
        }).select('id').single()
        if (pbErr) {
          console.error('[tiebreak] penalty_battles insert failed:', pbErr.message, pbErr.details)
          return NextResponse.json({ error: `Tiebreak init failed: ${pbErr.message}` }, { status: 500 })
        }
        if (pb) {
          await admin.from('duels').update({
            match_events:       events,
            challenger_score:   challengerScore,
            opponent_score:     opponentScore,
            winner_id:          null,
            stolen_card_ids:    [],
            status:             'tiebreak',
            tiebreak_battle_id: pb.id,
          }).eq('id', duelId)
          return NextResponse.json({ success: true })
        }
      }
    }

    // Cards the winner can steal = loser's played cards
    const loserPicks = winnerId === challId ? opponentPicks : challengerPicks
    let stolenCardIds: string[] = winnerId ? loserPicks.map((c) => c.id) : []

    // Update stats
    if (winnerId === challId) {
      const { data: p } = await admin.from('users').select('battle_streak, best_streak, battles_played, battles_won, daily_battles_won').eq('id', challId).single()
      const streak = (p?.battle_streak ?? 0) + 1
      await admin.from('users').update({
        battle_streak: streak,
        best_streak: Math.max(streak, p?.best_streak ?? 0),
        battles_played: (p?.battles_played ?? 0) + 1,
        battles_won: (p?.battles_won ?? 0) + 1,
        daily_battles_won: (p?.daily_battles_won ?? 0) + 1,
      }).eq('id', challId)
      if (oppId) {
        const { data: q } = await admin.from('users').select('battles_played').eq('id', oppId).single()
        await admin.from('users').update({ battle_streak: 0, battles_played: (q?.battles_played ?? 0) + 1 }).eq('id', oppId)
      }
    } else if (winnerId === oppId && oppId) {
      const { data: p } = await admin.from('users').select('battle_streak, best_streak, battles_played, battles_won, daily_battles_won').eq('id', oppId).single()
      const streak = (p?.battle_streak ?? 0) + 1
      await admin.from('users').update({
        battle_streak: streak,
        best_streak: Math.max(streak, p?.best_streak ?? 0),
        battles_played: (p?.battles_played ?? 0) + 1,
        battles_won: (p?.battles_won ?? 0) + 1,
        daily_battles_won: (p?.daily_battles_won ?? 0) + 1,
      }).eq('id', oppId)
      const { data: q } = await admin.from('users').select('battles_played').eq('id', challId).single()
      await admin.from('users').update({ battle_streak: 0, battles_played: (q?.battles_played ?? 0) + 1 }).eq('id', challId)
    } else if (botWon) {
      const { data: cp } = await admin.from('users').select('battles_played').eq('id', challId).single()
      await admin.from('users').update({ battle_streak: 0, battles_played: (cp?.battles_played ?? 0) + 1 }).eq('id', challId)
    } else {
      const [{ data: cp }, { data: oq }] = await Promise.all([
        admin.from('users').select('battles_played').eq('id', challId).single(),
        oppId ? admin.from('users').select('battles_played').eq('id', oppId).single() : Promise.resolve({ data: null }),
      ])
      await admin.from('users').update({ battles_played: (cp?.battles_played ?? 0) + 1 }).eq('id', challId)
      if (oppId && oq) await admin.from('users').update({ battles_played: (oq?.battles_played ?? 0) + 1 }).eq('id', oppId)
    }

    // If bot won → auto-steal stake_count best cards (by rarity) from user's collection
    if (botWon) {
      const rarityOrder: Record<string, number> = { Legend: 4, Epic: 3, Rare: 2, Common: 1 }
      const sortedUserPicks = [...challengerPicks].sort(
        (a, b) => (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0)
      )
      const count = Math.min(duel.stake_count ?? 1, sortedUserPicks.length)
      const toSteal = sortedUserPicks.slice(0, count)

      await Promise.all(
        toSteal.map((card) =>
          admin.from('user_cards').delete().eq('user_id', challId).eq('card_id', card.id)
        )
      )
      stolenCardIds = toSteal.map((c) => c.id)
    }

    // If bot won → skip stealing, finish immediately
    const nextStatus = (!winnerId || botWon) ? 'finished' : 'stealing'

    const { error: finishErr } = await admin.from('duels').update({
      match_events:     events,
      challenger_score: challengerScore,
      opponent_score:   opponentScore,
      winner_id:        winnerId,
      stolen_card_ids:  stolenCardIds,
      status:           nextStatus,
    }).eq('id', duelId)

    if (finishErr) {
      console.error('[pick] status update failed:', finishErr)
      return NextResponse.json({ error: finishErr.message }, { status: 500 })
    }

    if (winnerId) await completeMission(winnerId, 'battle')
  }

  return NextResponse.json({ success: true })
}
