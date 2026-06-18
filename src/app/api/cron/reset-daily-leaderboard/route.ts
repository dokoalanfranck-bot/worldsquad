import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const PRIZES = [300, 200, 100] as const

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Trouver le top 3 par daily_battles_won
  const { data: top3 } = await admin
    .from('users')
    .select('id, pseudo, daily_battles_won')
    .gt('daily_battles_won', 0)
    .order('daily_battles_won', { ascending: false })
    .limit(3)

  // Distribuer les récompenses
  const today = new Date().toISOString().slice(0, 10)
  if (top3 && top3.length > 0) {
    await Promise.allSettled(
      top3.map((u, i) =>
        Promise.all([
          admin.rpc('increment_coins', { user_id: u.id, delta: PRIZES[i] }),
          admin.from('coin_transactions').insert({
            user_id: u.id,
            amount:  PRIZES[i],
            reason:  `🏆 Classement journalier battles — #${i + 1} (${today})`,
          }),
        ])
      )
    )
  }

  // Remettre daily_battles_won à 0 pour tous
  await admin.from('users').update({ daily_battles_won: 0 }).gt('daily_battles_won', -1)

  return NextResponse.json({
    ok: true,
    rewarded: (top3 ?? []).map((u, i) => ({ pseudo: u.pseudo, wins: u.daily_battles_won, coins: PRIZES[i] })),
    date: today,
  })
}
