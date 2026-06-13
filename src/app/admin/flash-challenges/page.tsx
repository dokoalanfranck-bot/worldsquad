import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FlashChallengesClient } from './FlashChallengesClient'
import { getActiveFlashChallenges } from '@/lib/flash-challenges'

export default async function AdminFlashChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const [{ data: upcomingMatches }, activeChallenges] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .eq('status', 'upcoming')
      .order('match_date', { ascending: true })
      .limit(50),
    getActiveFlashChallenges(),
  ])

  return (
    <FlashChallengesClient
      upcomingMatches={upcomingMatches ?? []}
      activeChallenges={activeChallenges}
    />
  )
}
