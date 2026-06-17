import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called by Supabase pg_cron every minute (see migration 018)
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()
  const staleThreshold = new Date(Date.now() - 65_000).toISOString()
  const pickingThreshold = new Date(Date.now() - 5_000).toISOString()

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

  // ── 3. Cancel picking-expired duels ──────────────────────────────────────
  const { data: expiredDuels } = await admin
    .from('duels')
    .select('id')
    .eq('status', 'picking')
    .eq('is_bot', false)
    .not('picks_deadline', 'is', null)
    .lt('picks_deadline', pickingThreshold)

  if (expiredDuels && expiredDuels.length > 0) {
    await admin
      .from('duels')
      .update({ status: 'cancelled', cancelled_reason: 'picking_timeout' })
      .in('id', expiredDuels.map((d) => d.id))
  }

  // ── 4. Cancel picking-expired penalty battles ─────────────────────────────
  const { data: expiredPenalties } = await admin
    .from('penalty_battles')
    .select('id')
    .eq('status', 'picking')
    .not('picks_deadline', 'is', null)
    .lt('picks_deadline', pickingThreshold)

  if (expiredPenalties && expiredPenalties.length > 0) {
    await admin
      .from('penalty_battles')
      .update({ status: 'cancelled', cancelled_reason: 'picking_timeout' })
      .in('id', expiredPenalties.map((b) => b.id))
  }

  return NextResponse.json({
    ok: true,
    cancelledDuels: (expiredDuels ?? []).length,
    cancelledPenalties: (expiredPenalties ?? []).length,
  })
}
