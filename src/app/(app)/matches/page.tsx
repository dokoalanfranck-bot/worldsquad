import { createClient } from '@/lib/supabase/server'
import { MatchesClient } from './MatchesClient'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: matches }, { data: predictions }, { data: profile }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true }),
    supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user!.id),
    supabase.from('users').select('nation').eq('id', user!.id).single(),
  ])

  const predictionsByMatch = (predictions ?? []).reduce(
    (acc, p) => ({ ...acc, [p.match_id]: p }),
    {} as Record<string, typeof predictions[0]>
  )

  return (
    <MatchesClient
      matches={matches ?? []}
      predictionsByMatch={predictionsByMatch}
      userNation={profile?.nation ?? ''}
    />
  )
}
