import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LiveControlClient } from './LiveControlClient'

export const dynamic = 'force-dynamic'

export default async function LiveControlPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const admin = createAdminClient()

  // Matchs en direct
  const { data: liveMatches } = await admin
    .from('matches')
    .select('id, team_a, team_b, flag_a, flag_b, match_date, score_a, score_b, status, phase')
    .eq('status', 'live')
    .order('match_date', { ascending: true })

  // Prochains matchs (upcoming, les 10 plus proches)
  const { data: upcomingMatches } = await admin
    .from('matches')
    .select('id, team_a, team_b, flag_a, flag_b, match_date, score_a, score_b, status, phase')
    .eq('status', 'upcoming')
    .order('match_date', { ascending: true })
    .limit(10)

  const cronEnabled = !!process.env.RAPIDAPI_KEY

  return (
    <div>
      <LiveControlClient
        initialLive={liveMatches ?? []}
        initialUpcoming={upcomingMatches ?? []}
        cronEnabled={cronEnabled}
      />
    </div>
  )
}
