import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { creditCoins } from '@/lib/coins'

// Coins per day in streak (index = day - 1, capped at index 6)
const STREAK_REWARDS = [100, 150, 200, 250, 350, 500, 750]

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('coins, daily_reward_claimed_at, daily_streak')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const now = new Date()
  const lastClaim = profile.daily_reward_claimed_at ? new Date(profile.daily_reward_claimed_at) : null

  if (lastClaim) {
    const hoursSince = (now.getTime() - lastClaim.getTime()) / 3_600_000
    if (hoursSince < 24) {
      const nextClaim = new Date(lastClaim.getTime() + 86_400_000)
      return NextResponse.json({ error: 'already_claimed', nextClaim: nextClaim.toISOString() }, { status: 400 })
    }
  }

  // Consecutive day (within 48h window)
  let newStreak = 1
  if (lastClaim) {
    const hoursSince = (now.getTime() - lastClaim.getTime()) / 3_600_000
    if (hoursSince < 48) newStreak = (profile.daily_streak ?? 0) + 1
  }

  const rewardIndex = Math.min(newStreak - 1, STREAK_REWARDS.length - 1)
  const coinsReward = STREAK_REWARDS[rewardIndex]

  await admin
    .from('users')
    .update({ daily_reward_claimed_at: now.toISOString(), daily_streak: newStreak })
    .eq('id', user.id)

  await creditCoins(user.id, coinsReward, `Récompense quotidienne — Jour ${newStreak}`)

  return NextResponse.json({
    coins: coinsReward,
    streak: newStreak,
    newTotal: (profile.coins ?? 0) + coinsReward,
    nextStreak: Math.min(newStreak, STREAK_REWARDS.length - 1),
    nextReward: STREAK_REWARDS[Math.min(newStreak, STREAK_REWARDS.length - 1)],
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('daily_reward_claimed_at, daily_streak')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
  const rewardIndex = Math.min(streak, STREAK_REWARDS.length - 1)

  return NextResponse.json({
    canClaim,
    nextClaim,
    streak,
    todayReward: canClaim ? STREAK_REWARDS[rewardIndex] : STREAK_REWARDS[Math.min(streak - 1, STREAK_REWARDS.length - 1)],
    streakRewards: STREAK_REWARDS,
  })
}
