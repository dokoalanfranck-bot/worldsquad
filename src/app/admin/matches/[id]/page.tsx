import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { MatchEditClient } from './MatchEditClient'

export const dynamic = 'force-dynamic'

export default async function AdminMatchEditPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const [{ data: match }, { count: predictionsCount }] = await Promise.all([
    supabase.from('matches').select('*').eq('id', params.id).single(),
    supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('match_id', params.id),
  ])

  if (!match) notFound()

  return (
    <MatchEditClient
      match={match}
      predictionsCount={predictionsCount ?? 0}
    />
  )
}
