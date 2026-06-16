import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { trackAbandon } from '@/lib/battle-sanctions'

// Called by Vercel Cron every minute (see vercel.json)
// Also callable manually: GET /api/cron/cleanup (protected by CRON_SECRET)
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const staleThreshold = new Date(now.getTime() - 65_000).toISOString()
  const pickingThreshold = new Date(now.getTime() - 5_000).toISOString()

  // ── 1. Cancel open duels with no opponent after 65s ───────────────────────
  await admin
    .from('duels')
    .update({ status: 'cancelled', cancelled_reason: 'no_opponent' })
    .eq('status', 'open')
    .eq('is_bot', false)
    .is('opponent_id', null)
    .lt('created_at', staleThreshold)

  // ── 2. Cancel waiting penalty battles with no opponent after 65s ──────────
  await admin
    .from('penalty_battles')
    .update({ status: 'cancelled', cancelled_reason: 'no_opponent' })
    .eq('status', 'waiting')
    .is('opponent_id', null)
    .lt('created_at', staleThreshold)

  // ── 3. Penalize + cancel picking-expired duels ────────────────────────────
  const { data: expiredDuels } = await admin
    .from('duels')
    .select('id, challenger_id, opponent_id, challenger_picks, opponent_picks')
    .eq('status', 'picking')
    .eq('is_bot', false)
    .not('picks_deadline', 'is', null)
    .lt('picks_deadline', pickingThreshold)

  for (const duel of expiredDuels ?? []) {
    const topenalize: string[] = []
    if (!duel.challenger_picks) topenalize.push(duel.challenger_id)
    if (!duel.opponent_picks && duel.opponent_id) topenalize.push(duel.opponent_id as string)

    await Promise.all(topenalize.map((uid) => trackAbandon(uid, admin)))

    await admin
      .from('duels')
      .update({ status: 'cancelled', cancelled_reason: 'picking_timeout' })
      .eq('id', duel.id)
      .eq('status', 'picking')
  }

  // ── 4. Penalize + cancel picking-expired penalty battles ──────────────────
  const { data: expiredPenalties } = await admin
    .from('penalty_battles')
    .select('id, challenger_id, opponent_id, challenger_picks, opponent_picks')
    .eq('status', 'picking')
    .not('picks_deadline', 'is', null)
    .lt('picks_deadline', pickingThreshold)

  for (const battle of expiredPenalties ?? []) {
    const topenalize: string[] = []
    if (!battle.challenger_picks) topenalize.push(battle.challenger_id)
    if (!battle.opponent_picks && battle.opponent_id) topenalize.push(battle.opponent_id as string)

    await Promise.all(topenalize.map((uid) => trackAbandon(uid, admin)))

    await admin
      .from('penalty_battles')
      .update({ status: 'cancelled', cancelled_reason: 'picking_timeout' })
      .eq('id', battle.id)
      .eq('status', 'picking')
  }

  return NextResponse.json({
    ok: true,
    cancelledDuels: (expiredDuels ?? []).length,
    cancelledPenalties: (expiredPenalties ?? []).length,
  })
}
