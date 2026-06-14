import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { simulateDuel, pickRewardCard } from '@/lib/duel-engine'
import { completeMission } from '@/lib/missions'
import type { Card } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { playerIds, coachId } = await req.json() as { playerIds: string[]; coachId: string }

  if (!Array.isArray(playerIds) || playerIds.length !== 3 || !coachId) {
    return NextResponse.json({ error: '3 joueurs + 1 coach requis' }, { status: 400 })
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
  const isOpponent = duel.opponent_id === user.id
  if (!isChallenger && !isOpponent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Already picked?
  if (isChallenger && duel.challenger_picks) return NextResponse.json({ error: 'Déjà soumis' }, { status: 400 })
  if (isOpponent && duel.opponent_picks) return NextResponse.json({ error: 'Déjà soumis' }, { status: 400 })

  // Verify ownership of all 4 cards
  const allIds = [...playerIds, coachId]
  const { data: owned } = await admin
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user.id)
    .in('card_id', allIds)

  const ownedSet = new Set((owned ?? []).map((r) => r.card_id))
  if (!allIds.every((id) => ownedSet.has(id))) {
    return NextResponse.json({ error: 'Cartes non possédées' }, { status: 400 })
  }

  // Fetch card details
  const { data: cardsRaw } = await admin.from('cards').select('*').in('id', allIds)
  if (!cardsRaw || cardsRaw.length !== 4) {
    return NextResponse.json({ error: 'Cartes introuvables' }, { status: 400 })
  }

  const myPicks = allIds.map((id) => cardsRaw.find((c) => c.id === id)).filter(Boolean) as Card[]
  const pickField = isChallenger ? 'challenger_picks' : 'opponent_picks'

  // Save picks
  await admin.from('duels').update({ [pickField]: myPicks }).eq('id', duelId)

  // Re-fetch to see if both picks are ready
  const { data: fresh } = await admin.from('duels').select('*').eq('id', duelId).single()
  if (!fresh) return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })

  const challengerPicks = (isChallenger ? myPicks : fresh.challenger_picks) as Card[] | null
  const opponentPicks = (!isChallenger ? myPicks : fresh.opponent_picks) as Card[] | null

  // Both ready → simulate
  if (challengerPicks && opponentPicks) {
    const { events, challengerScore, opponentScore } = simulateDuel(challengerPicks, opponentPicks, duelId)

    const winnerId = challengerScore > opponentScore
      ? duel.challenger_id
      : opponentScore > challengerScore && duel.opponent_id
        ? duel.opponent_id
        : null // draw or bot-won (bot has no user id)

    const botWon = !!duel.is_bot && opponentScore > challengerScore

    // Assign reward card: best card from loser's picks that winner doesn't already own
    let rewardCardId: string | null = null
    if (winnerId) {
      const loserPicks = winnerId === duel.challenger_id ? opponentPicks : challengerPicks
      const winnerPicks = winnerId === duel.challenger_id ? challengerPicks : opponentPicks
      const rewardCard = pickRewardCard(loserPicks, winnerPicks)
      if (rewardCard) {
        const loserId = winnerId === duel.challenger_id ? duel.opponent_id : duel.challenger_id

        if (loserId) {
          // Transfer card from real loser
          await admin.from('user_cards').delete().eq('user_id', loserId).eq('card_id', rewardCard.id)
          await admin.from('user_cards').upsert(
            { user_id: winnerId, card_id: rewardCard.id, obtained_via: 'battle' },
            { onConflict: 'user_id,card_id' }
          )
        } else if (duel.is_bot) {
          // Bot opponent → winner gets card from global pool (already in their collection from bot picks)
          await admin.from('user_cards').upsert(
            { user_id: winnerId, card_id: rewardCard.id, obtained_via: 'battle' },
            { onConflict: 'user_id,card_id' }
          )
        }

        rewardCardId = rewardCard.id
      }
    }

    // Update stats
    const challId = duel.challenger_id
    const oppId = duel.opponent_id as string | null

    if (winnerId === challId) {
      const { data: p } = await admin.from('users').select('battle_streak, best_streak, battles_played, battles_won').eq('id', challId).single()
      const streak = (p?.battle_streak ?? 0) + 1
      await admin.from('users').update({
        battle_streak: streak,
        best_streak: Math.max(streak, p?.best_streak ?? 0),
        battles_played: (p?.battles_played ?? 0) + 1,
        battles_won: (p?.battles_won ?? 0) + 1,
      }).eq('id', challId)
      if (oppId) {
        const { data: q } = await admin.from('users').select('battles_played').eq('id', oppId).single()
        await admin.from('users').update({ battle_streak: 0, battles_played: (q?.battles_played ?? 0) + 1 }).eq('id', oppId)
      }
    } else if (winnerId === oppId && oppId) {
      const { data: p } = await admin.from('users').select('battle_streak, best_streak, battles_played, battles_won').eq('id', oppId).single()
      const streak = (p?.battle_streak ?? 0) + 1
      await admin.from('users').update({
        battle_streak: streak,
        best_streak: Math.max(streak, p?.best_streak ?? 0),
        battles_played: (p?.battles_played ?? 0) + 1,
        battles_won: (p?.battles_won ?? 0) + 1,
      }).eq('id', oppId)
      const { data: q } = await admin.from('users').select('battles_played').eq('id', challId).single()
      await admin.from('users').update({ battle_streak: 0, battles_played: (q?.battles_played ?? 0) + 1 }).eq('id', challId)
    } else if (botWon) {
      // Bot won — human lost: reset streak
      const { data: cp } = await admin.from('users').select('battles_played').eq('id', challId).single()
      await admin.from('users').update({ battle_streak: 0, battles_played: (cp?.battles_played ?? 0) + 1 }).eq('id', challId)
    } else {
      // Actual draw — increment battles_played for both, no streak change
      const [{ data: cp }, { data: oq }] = await Promise.all([
        admin.from('users').select('battles_played').eq('id', challId).single(),
        oppId ? admin.from('users').select('battles_played').eq('id', oppId).single() : Promise.resolve({ data: null }),
      ])
      await admin.from('users').update({ battles_played: (cp?.battles_played ?? 0) + 1 }).eq('id', challId)
      if (oppId && oq) await admin.from('users').update({ battles_played: (oq?.battles_played ?? 0) + 1 }).eq('id', oppId)
    }

    await admin.from('duels').update({
      match_events: events,
      challenger_score: challengerScore,
      opponent_score: opponentScore,
      winner_id: winnerId,
      reward_card_id: rewardCardId,
      status: 'finished',
    }).eq('id', duelId)

    // Complete battle mission for the winner
    if (winnerId) {
      await completeMission(winnerId, 'battle')
    }
  }

  return NextResponse.json({ success: true })
}
