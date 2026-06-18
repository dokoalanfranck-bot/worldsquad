import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { seededShuffle } from '@/lib/duel-engine'
import { getBotPicksFromPool } from '@/lib/tournament-engine'
import { sendPushToUser } from '@/lib/push'
import type { Card } from '@/types'

export const dynamic = 'force-dynamic'

async function buildBotPicks(
  admin: ReturnType<typeof createAdminClient>,
  seed: string,
): Promise<Card[]> {
  const { data } = await admin.from('cards').select('id, name, rarity, image_url, stats, type, nation, description, created_at').eq('type', 'player').limit(200)
  const pool = seededShuffle((data ?? []) as Card[], seed)
  return getBotPicksFromPool(pool, seed)
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: t } = await admin.from('tournaments').select('*').eq('id', id).single()
  if (!t || !['semi_active', 'final_active'].includes(t.status)) {
    return NextResponse.json({ status: t?.status ?? 'unknown' })
  }

  // ── PHASE FINALE : vérifier si le duel final est terminé ──────────────────
  if (t.status === 'final_active' && t.final_duel_id && !t.final) {
    const { data: fd } = await admin
      .from('duels')
      .select('winner_id, challenger_id, challenger_score, opponent_score, match_events, status')
      .eq('id', t.final_duel_id)
      .single()

    if (fd && fd.winner_id) {
      const challWon  = fd.winner_id === fd.challenger_id
      const winnerSlot = challWon ? t.semi1_winner_slot : t.semi2_winner_slot
      const winnerId   = fd.winner_id

      await admin.from('tournaments').update({
        final:       { scoreA: fd.challenger_score, scoreB: fd.opponent_score, events: fd.match_events, winner: winnerSlot },
        winner_slot: winnerSlot,
        winner_id:   winnerId,
        status:      'finished',
        coins_won:   winnerSlot === 0 ? 300 : 0,
      }).eq('id', id)

      // Distribuer les coins
      const finalistSlot = challWon ? t.semi2_winner_slot : t.semi1_winner_slot
      const finalistId   = challWon ? t.semi2_winner_id   : t.semi1_winner_id

      const prizes = [
        { userId: winnerId,  amount: 300, label: '🏆 Tournoi 1ère place' },
        ...(finalistId && finalistId !== winnerId ? [{ userId: finalistId, amount: 100, label: '🥈 Tournoi 2ème place' }] : []),
      ]
      await Promise.allSettled(
        prizes.map((p) =>
          Promise.all([
            admin.rpc('increment_coins', { user_id: p.userId, delta: p.amount }),
            admin.from('coin_transactions').insert({ user_id: p.userId, amount: p.amount, reason: `${p.label} — ${id.slice(0, 8)}` }),
          ]),
        ),
      )
    }
    return NextResponse.json({ status: 'final_active' })
  }

  // ── PHASE SEMI : vérifier si les deux demi-finales sont terminées ─────────
  if (t.status !== 'semi_active') return NextResponse.json({ status: t.status })

  // Résultat semi1
  let semi1Done = !!t.semi1
  let semi1WinnerId: string | null = t.semi1_winner_id ?? null
  let semi1WinnerSlot = t.semi1_winner_slot ?? null

  if (!semi1Done && t.semi1_duel_id) {
    const { data: d1 } = await admin.from('duels')
      .select('winner_id, challenger_id, challenger_score, opponent_score, match_events')
      .eq('id', t.semi1_duel_id).single()
    if (d1?.winner_id) {
      const challWon1 = d1.winner_id === d1.challenger_id
      semi1Done        = true
      semi1WinnerId    = d1.winner_id
      semi1WinnerSlot  = challWon1 ? 0 : 1
      await admin.from('tournaments').update({
        semi1: { scoreA: d1.challenger_score, scoreB: d1.opponent_score, events: d1.match_events, winner: semi1WinnerSlot },
        semi1_winner_id:   semi1WinnerId,
        semi1_winner_slot: semi1WinnerSlot,
      }).eq('id', id)
    }
  }

  // Résultat semi2
  let semi2Done = !!t.semi2
  let semi2WinnerId: string | null = t.semi2_winner_id ?? null
  let semi2WinnerSlot = t.semi2_winner_slot ?? null

  if (!semi2Done && t.semi2_duel_id) {
    const { data: d2 } = await admin.from('duels')
      .select('winner_id, challenger_id, challenger_score, opponent_score, match_events')
      .eq('id', t.semi2_duel_id).single()
    if (d2?.winner_id) {
      const challWon2 = d2.winner_id === d2.challenger_id
      semi2Done        = true
      semi2WinnerId    = d2.winner_id
      semi2WinnerSlot  = challWon2 ? 2 : 3
      await admin.from('tournaments').update({
        semi2: { scoreA: d2.challenger_score, scoreB: d2.opponent_score, events: d2.match_events, winner: semi2WinnerSlot },
        semi2_winner_id:   semi2WinnerId,
        semi2_winner_slot: semi2WinnerSlot,
      }).eq('id', id)
    }
  }

  if (!semi1Done || !semi2Done) return NextResponse.json({ status: 'semi_active' })

  // ── Les deux semis sont terminées — créer la FINALE ───────────────────────
  if (t.final_duel_id) return NextResponse.json({ status: 'final_active' }) // déjà créée

  const semi1Pseudo = semi1WinnerSlot === 0 ? t.p0_pseudo : t.p1_pseudo
  const semi1Nation = semi1WinnerSlot === 0 ? t.p0_nation : t.p1_nation
  const semi2Pseudo = semi2WinnerSlot === 2 ? t.p2_pseudo : t.p3_pseudo

  let finalDuelId: string | null = null

  if (semi1WinnerId && semi2WinnerId) {
    // Finale vrai vs vrai
    const { data: fd } = await admin.from('duels').insert({
      challenger_id:    semi1WinnerId,
      opponent_id:      semi2WinnerId,
      is_bot:           false,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    id,
      tournament_round: 'final',
    }).select('id').single()
    finalDuelId = fd?.id ?? null
    // Notifier les deux finalistes
    await Promise.allSettled([
      sendPushToUser(semi1WinnerId, { title: '🏆 Finale de tournoi !', body: `Tu affrontes ${semi2Pseudo} en finale. Choisis tes cartes !`, url: `/battles/tournament/${id}`, tag: `final-${id}` }),
      sendPushToUser(semi2WinnerId, { title: '🏆 Finale de tournoi !', body: `Tu affrontes ${semi1Pseudo} en finale. Choisis tes cartes !`, url: `/battles/tournament/${id}`, tag: `final-${id}` }),
    ])
  } else if (semi1WinnerId && !semi2WinnerId) {
    // Finale vrai vs bot
    const { data: fd } = await admin.from('duels').insert({
      challenger_id:    semi1WinnerId,
      is_bot:           true,
      bot_name:         semi2Pseudo,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    id,
      tournament_round: 'final',
    }).select('id').single()
    if (fd) {
      const botPicks = await buildBotPicks(admin, id + '_final_bot')
      await admin.from('duels').update({ opponent_picks: botPicks, status: 'picking', picks_deadline: new Date(Date.now() + 45000).toISOString() }).eq('id', fd.id)
      finalDuelId = fd.id
    }
    if (semi1WinnerId) {
      await sendPushToUser(semi1WinnerId, { title: '🏆 Finale de tournoi !', body: `Tu affrontes ${semi2Pseudo} en finale. Choisis tes cartes !`, url: `/battles/tournament/${id}`, tag: `final-${id}` }).catch(() => {})
    }
  }

  await admin.from('tournaments').update({
    final_duel_id:     finalDuelId,
    semi1_winner_id:   semi1WinnerId,
    semi1_winner_slot: semi1WinnerSlot,
    semi2_winner_id:   semi2WinnerId,
    semi2_winner_slot: semi2WinnerSlot,
    status:            'final_active',
  }).eq('id', id)

  return NextResponse.json({ status: 'final_active', finalDuelId })
}
