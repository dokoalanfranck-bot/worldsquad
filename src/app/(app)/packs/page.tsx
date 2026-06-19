import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PacksClient } from './PacksClient'

export const dynamic = 'force-dynamic'

export interface TodayNation {
  name: string
  flag: string
}

export default async function PacksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const [{ data: profile }, { data: todayMatches }] = await Promise.all([
    supabase.from('users').select('coins, pseudo').eq('id', user.id).single(),
    admin.from('matches')
      .select('team_a, team_b, flag_a, flag_b')
      .gte('match_date', startOfDay)
      .lt('match_date', endOfDay),
  ])

  // Dédupliquer les nations (une nation peut jouer plusieurs fois le même jour)
  const nationMap = new Map<string, string>()
  for (const m of todayMatches ?? []) {
    if (m.team_a && !nationMap.has(m.team_a)) nationMap.set(m.team_a, m.flag_a ?? '🏳')
    if (m.team_b && !nationMap.has(m.team_b)) nationMap.set(m.team_b, m.flag_b ?? '🏳')
  }
  const todayNations: TodayNation[] = Array.from(nationMap.entries()).map(([name, flag]) => ({ name, flag }))

  return (
    <PacksClient
      initialCoins={profile?.coins ?? 0}
      pseudo={profile?.pseudo ?? ''}
      todayNations={todayNations}
    />
  )
}
