import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { MatchesClient } from './MatchesClient'
import type { Prediction } from '@/types'

// Matchs mis en cache 60 secondes (changent rarement)
const getMatches = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase.from('matches').select('*').order('match_date', { ascending: true })
    return data ?? []
  },
  ['matches-list'],
  { revalidate: 60 }
)

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [matches, { data: predictions }, { data: profile }] = await Promise.all([
    getMatches(),
    supabase.from('predictions').select('*').eq('user_id', user!.id),
    supabase.from('users').select('nation').eq('id', user!.id).single(),
  ])

  // Dédupliquer par ID (sécurité si doublons en base)
  const uniqueMatches = Array.from(
    new Map((matches ?? []).map((m) => [m.id, m])).values()
  )

  const predictionsByMatch = (predictions ?? []).reduce(
    (acc, p) => ({ ...acc, [p.match_id]: p }),
    {} as Record<string, Prediction>
  )

  return (
    <MatchesClient
      matches={uniqueMatches}
      predictionsByMatch={predictionsByMatch}
      userNation={profile?.nation ?? ''}
    />
  )
}
