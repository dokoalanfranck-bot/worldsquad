import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MatchmakingClient } from './MatchmakingClient'

export default async function MatchmakingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, pseudo, nation, photo_url, coins, battles_played')
    .eq('id', user.id)
    .single()

  return <MatchmakingClient userId={user.id} pseudo={profile?.pseudo ?? '?'} />
}
