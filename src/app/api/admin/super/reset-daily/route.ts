import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/superAdminAudit'

const PRIZES = [300, 200, 100] as const

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_super_admin, pseudo').eq('id', user.id).single()
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Top 3
  const { data: top3 } = await admin
    .from('users')
    .select('id, pseudo, daily_battles_won')
    .gt('daily_battles_won', 0)
    .order('daily_battles_won', { ascending: false })
    .limit(3)

  const today = new Date().toISOString().slice(0, 10)
  if (top3 && top3.length > 0) {
    await Promise.allSettled(
      top3.map((u, i) =>
        Promise.all([
          admin.rpc('increment_coins', { user_id: u.id, delta: PRIZES[i] }),
          admin.from('coin_transactions').insert({
            user_id: u.id,
            amount: PRIZES[i],
            reason: `🏆 Classement journalier battles — #${i + 1} (${today})`,
          }),
        ])
      )
    )
  }

  await admin.from('users').update({ daily_battles_won: 0 }).gt('daily_battles_won', -1)

  await logAudit({
    adminId: user.id,
    adminPseudo: me.pseudo,
    action: 'reset_daily_leaderboard',
    metadata: { date: today, rewarded: (top3 ?? []).map((u, i) => ({ pseudo: u.pseudo, wins: u.daily_battles_won, coins: PRIZES[i] })) },
  })

  return NextResponse.json({
    ok: true,
    rewarded: (top3 ?? []).map((u, i) => ({ pseudo: u.pseudo, wins: u.daily_battles_won, coins: PRIZES[i] })),
    date: today,
  })
}
