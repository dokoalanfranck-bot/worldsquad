import { createAdminClient } from '@/lib/supabase/admin'
import { seededShuffle } from '@/lib/duel-engine'
import { simulateTournament, getBotPicksFromPool } from '@/lib/tournament-engine'
import type { Card } from '@/types'

async function buildBotPicks(
  admin: ReturnType<typeof createAdminClient>,
  seed: string,
): Promise<Card[]> {
  const { data } = await admin
    .from('cards')
    .select('id, name, rarity, image_url, stats, type, nation, description, created_at')
    .eq('type', 'player')
    .limit(200)
  const pool = seededShuffle((data ?? []) as Card[], seed)
  return getBotPicksFromPool(pool, seed)
}

export async function launchSemis(
  admin: ReturnType<typeof createAdminClient>,
  t: {
    id: string
    p0_id: string; p0_pseudo: string; p0_nation: string
    p1_id: string | null; p1_pseudo: string; p1_nation: string
    p2_id: string | null; p2_pseudo: string; p2_nation: string
    p3_id: string | null; p3_pseudo: string; p3_nation: string
  },
) {
  const seed = t.id

  // ── Semi1: p0 vs p1 ──────────────────────────────────────────────────────
  let semi1DuelId: string | null = null

  if (t.p1_id) {
    const { data: d } = await admin.from('duels').insert({
      challenger_id:    t.p0_id,
      opponent_id:      t.p1_id,
      is_bot:           false,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    t.id,
      tournament_round: 'semi1',
    }).select('id').single()
    semi1DuelId = d?.id ?? null
  } else {
    const { data: d } = await admin.from('duels').insert({
      challenger_id:    t.p0_id,
      is_bot:           true,
      bot_name:         t.p1_pseudo,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    t.id,
      tournament_round: 'semi1',
    }).select('id').single()
    if (d) {
      const botPicks = await buildBotPicks(admin, seed + '_p1')
      await admin.from('duels').update({
        opponent_picks: botPicks,
        status: 'picking',
        picks_deadline: new Date(Date.now() + 40000).toISOString(),
      }).eq('id', d.id)
      semi1DuelId = d.id
    }
  }

  // ── Semi2: p2 vs p3 ──────────────────────────────────────────────────────
  let semi2DuelId: string | null = null
  let semi2Result: Record<string, unknown> | null = null

  if (!t.p2_id && !t.p3_id) {
    // Bot vs Bot — simuler immédiatement, pas de duel créé
    const { data: cardPool } = await admin
      .from('cards')
      .select('id, name, rarity, image_url, stats, type, nation, description, created_at')
      .eq('type', 'player')
      .limit(200)
    const pool = (cardPool ?? []) as Card[]
    const p2picks = getBotPicksFromPool(pool, seed + '_p2')
    const p3picks = getBotPicksFromPool(pool, seed + '_p3')
    const sim = simulateTournament([p2picks, p3picks, p2picks, p3picks], seed + '_semi2only')
    const semi2Winner = sim.semi1.winner
    semi2Result = {
      scoreA: sim.semi1.scoreA,
      scoreB: sim.semi1.scoreB,
      events: sim.semi1.events,
      winner: semi2Winner + 2,
    }
  } else if (t.p2_id && !t.p3_id) {
    const { data: d } = await admin.from('duels').insert({
      challenger_id:    t.p2_id,
      is_bot:           true,
      bot_name:         t.p3_pseudo,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    t.id,
      tournament_round: 'semi2',
    }).select('id').single()
    if (d) {
      const botPicks = await buildBotPicks(admin, seed + '_p3')
      await admin.from('duels').update({
        opponent_picks: botPicks,
        status: 'picking',
        picks_deadline: new Date(Date.now() + 40000).toISOString(),
      }).eq('id', d.id)
      semi2DuelId = d.id
    }
  } else if (t.p2_id && t.p3_id) {
    const { data: d } = await admin.from('duels').insert({
      challenger_id:    t.p2_id,
      opponent_id:      t.p3_id,
      is_bot:           false,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    t.id,
      tournament_round: 'semi2',
    }).select('id').single()
    semi2DuelId = d?.id ?? null
  }

  await admin.from('tournaments').update({
    status:        'semi_active',
    semi1_duel_id: semi1DuelId,
    semi2_duel_id: semi2DuelId,
    ...(semi2Result ? { semi2: semi2Result } : {}),
  }).eq('id', t.id)
}
