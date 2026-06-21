import { createAdminClient } from '@/lib/supabase/admin'
import { HighlightsAdminClient } from './HighlightsAdminClient'

export default async function HighlightsAdminPage() {
  const admin = createAdminClient()
  const [{ data: highlights }, { data: matches }] = await Promise.all([
    admin.from('highlights').select('id, title, youtube_id, match_id, created_at').order('created_at', { ascending: false }),
    admin.from('matches').select('id, team_a, team_b, match_date').order('match_date', { ascending: false }).limit(100),
  ])

  return <HighlightsAdminClient highlights={highlights ?? []} matches={matches ?? []} />
}
