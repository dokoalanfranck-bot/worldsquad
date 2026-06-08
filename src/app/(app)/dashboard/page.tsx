import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const [{ data: profile }, { data: nextMatch }, { data: recentPredictions }, { data: groupData }] =
    await Promise.all([
      supabase.from('users').select('*').eq('id', authUser.id).single(),
      supabase
        .from('matches')
        .select('*')
        .eq('status', 'upcoming')
        .order('match_date', { ascending: true })
        .limit(1)
        .single(),
      supabase
        .from('predictions')
        .select('*, match:matches(*)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('group_members')
        .select('group:groups(*)')
        .eq('user_id', authUser.id)
        .limit(1)
        .single(),
    ])

  // Profil introuvable = compte auth sans profil (signup incomplet → recommencer)
  if (!profile) redirect('/signup')

  let groupActivity = null
  if (groupData?.group) {
    const groupId = (groupData.group as unknown as { id: string }).id
    const { data: activities } = await supabase
      .from('group_activities')
      .select('*, user:users(pseudo, photo_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(10)
    groupActivity = activities
  }

  return (
    <DashboardClient
      profile={profile}
      nextMatch={nextMatch}
      recentPredictions={recentPredictions ?? []}
      group={groupData?.group as unknown as { id: string; name: string; code: string } | null}
      groupActivity={groupActivity ?? []}
    />
  )
}
