import { createAdminClient } from '@/lib/supabase/admin'
import { MatchesClient } from './MatchesClient'

export const dynamic = 'force-dynamic'

interface SearchParams {
  phase?: string
  status?: string
  search?: string
}

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createAdminClient()

  let query = supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: false })

  const phase = searchParams.phase
  const status = searchParams.status
  const search = searchParams.search

  if (phase && phase !== 'all') {
    query = query.eq('phase', phase)
  }
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (search) {
    query = query.or(`team_a.ilike.%${search}%,team_b.ilike.%${search}%`)
  }

  const { data: matches } = await query.limit(100)

  return (
    <MatchesClient
      matches={matches ?? []}
      currentPhase={phase ?? 'all'}
      currentStatus={status ?? 'all'}
      currentSearch={search ?? ''}
    />
  )
}
