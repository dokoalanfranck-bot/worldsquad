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

  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo   = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: signupData },
    { data: activeData },
    { count: total },
    { count: played1 },
    { count: played10 },
    { count: openedPack },
    { count: isVip },
    { count: neverPlayed },
  ] = await Promise.all([
    admin.from('users').select('created_at').gte('created_at', fourteenDaysAgo),
    admin.from('users').select('last_seen_at').gte('last_seen_at', sevenDaysAgo).not('last_seen_at', 'is', null),
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('battles_played', 1),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('battles_played', 10),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('pack_opened', 1),
    admin.from('users').select('*', { count: 'exact', head: true }).eq('is_vip', true),
    admin.from('users').select('*', { count: 'exact', head: true }).eq('battles_played', 0),
  ])

  // Daily signups — group by date in JS
  const signupsByDay: Record<string, number> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    signupsByDay[d.toISOString().split('T')[0]] = 0
  }
  ;(signupData ?? []).forEach((u: { created_at: string }) => {
    const d = u.created_at.split('T')[0]
    if (d in signupsByDay) signupsByDay[d]++
  })

  // Heatmap by hour (last 7 days)
  const hourCounts = Array(24).fill(0)
  ;(activeData ?? []).forEach((u: { last_seen_at: string }) => {
    const h = new Date(u.last_seen_at).getHours()
    if (h >= 0 && h < 24) hourCounts[h]++
  })

  return NextResponse.json({
    signups: Object.entries(signupsByDay).map(([date, count]) => ({ date, count })),
    heatmap: hourCounts.map((count, hour) => ({ hour, count })),
    funnel: [
      { label: 'Inscrits', count: total ?? 0 },
      { label: '≥1 battle', count: played1 ?? 0 },
      { label: '≥10 battles', count: played10 ?? 0 },
      { label: 'Pack ouvert', count: openedPack ?? 0 },
      { label: 'VIP', count: isVip ?? 0 },
    ],
    neverPlayed: neverPlayed ?? 0,
  })
}
