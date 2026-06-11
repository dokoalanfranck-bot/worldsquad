import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

const STREAK_REWARDS = [100, 150, 200, 250, 350, 500, 750]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const [{ data: profile }, { data: nextMatch }, { data: recentPredictions }, { data: groupData }, { data: liveMatches }, { data: recentFinished }] =
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
      supabase
        .from('matches')
        .select('*')
        .eq('status', 'live')
        .order('match_date', { ascending: true }),
      supabase
        .from('matches')
        .select('*')
        .eq('status', 'finished')
        .order('match_date', { ascending: false })
        .limit(4),
    ])

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

  // Compute daily reward state server-side
  const lastClaim = profile.daily_reward_claimed_at ? new Date(profile.daily_reward_claimed_at) : null
  const now = new Date()
  let canClaim = true
  let nextClaim: string | null = null

  if (lastClaim) {
    const hoursSince = (now.getTime() - lastClaim.getTime()) / 3_600_000
    if (hoursSince < 24) {
      canClaim = false
      nextClaim = new Date(lastClaim.getTime() + 86_400_000).toISOString()
    }
  }

  const streak = profile.daily_streak ?? 0
  const rewardIndex = Math.min(canClaim ? streak : streak - 1, STREAK_REWARDS.length - 1)
  const todayReward = STREAK_REWARDS[Math.max(0, rewardIndex)]

  return (
    <DashboardClient
      profile={profile}
      nextMatch={nextMatch}
      recentPredictions={recentPredictions ?? []}
      group={groupData?.group as unknown as { id: string; name: string; code: string } | null}
      groupActivity={groupActivity ?? []}
      dailyReward={{ canClaim, nextClaim, streak, todayReward }}
      liveMatches={liveMatches ?? []}
      recentFinished={recentFinished ?? []}
    />
  )
}
