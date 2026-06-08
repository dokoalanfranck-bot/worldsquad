import { createAdminClient } from '@/lib/supabase/admin'
import { TeamsClient } from './TeamsClient'

export const dynamic = 'force-dynamic'

export default async function AdminTeamsPage() {
  const supabase = createAdminClient()

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('group_letter', { ascending: true })
    .order('name', { ascending: true })

  return <TeamsClient teams={teams ?? []} />
}
