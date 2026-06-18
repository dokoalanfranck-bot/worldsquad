import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_super_admin').eq('id', user.id).single()
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  const [
    { count: totalUsers },
    { count: newToday },
    { count: activeToday },
    { count: battlesToday },
    { count: penaltiesToday },
    { count: tournoisToday },
    { count: bannedUsers },
    { data: coinsData },
  ] = await Promise.all([
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('last_seen_at', todayIso),
    admin.from('duels').select('*', { count: 'exact', head: true }).eq('status', 'finished').gte('created_at', todayIso),
    admin.from('penalty_battles').select('*', { count: 'exact', head: true }).eq('status', 'finished').gte('created_at', todayIso),
    admin.from('tournaments').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
    admin.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    admin.from('coin_transactions').select('amount').gte('created_at', todayIso),
  ])

  const coinsMovedToday = (coinsData ?? []).reduce((sum, t) => sum + Math.abs(t.amount ?? 0), 0)

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    newToday: newToday ?? 0,
    activeToday: activeToday ?? 0,
    battlesToday: (battlesToday ?? 0) + (penaltiesToday ?? 0),
    tournoisToday: tournoisToday ?? 0,
    bannedUsers: bannedUsers ?? 0,
    coinsMovedToday,
  })
}
