import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: nextMatch }, { data: recentPredictions }, { data: groupData }] =
    await Promise.all([
      supabase.from('users').select('*').eq('id', authUser!.id).single(),
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
        .eq('user_id', authUser!.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('group_members')
        .select('group:groups(*)')
        .eq('user_id', authUser!.id)
        .limit(1)
        .single(),
    ])

  // Get group activity if user has a group
  let groupActivity = null
  let groupLeaderboard = null
  if (groupData?.group) {
    const groupId = (groupData.group as { id: string }).id
    const [{ data: activities }, { data: members }] = await Promise.all([
      supabase
        .from('group_activities')
        .select('*, user:users(pseudo, photo_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('group_members')
        .select('user:users(id, pseudo, photo_url, nation, coins, predictions_correct, battles_won)')
        .eq('group_id', groupId),
    ])
    groupActivity = activities
    groupLeaderboard = members?.map((m) => m.user).sort(
      (a: any, b: any) => (b?.coins ?? 0) - (a?.coins ?? 0)
    )
  }

  return (
    <DashboardClient
      profile={profile!}
      nextMatch={nextMatch}
      recentPredictions={recentPredictions ?? []}
      group={groupData?.group as { id: string; name: string; code: string } | null}
      groupActivity={groupActivity ?? []}
      groupLeaderboard={groupLeaderboard ?? []}
    />
  )
}
