import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { LeaderboardClient } from './LeaderboardClient'

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: topCoins }, { data: topPredictions }, { data: rawBattles }] = await Promise.all([
    admin
      .from('users')
      .select('id, pseudo, photo_url, nation, coins, predictions_correct, battles_won')
      .order('coins', { ascending: false })
      .limit(100),
    admin
      .from('users')
      .select('id, pseudo, photo_url, nation, coins, predictions_correct, battles_won')
      .order('predictions_correct', { ascending: false })
      .limit(100),
    admin
      .from('users')
      .select('id, pseudo, photo_url, nation, battles_won, battles_played, battle_streak, best_streak')
      .gt('battles_played', 0)
      .limit(200),
  ])

  const topBattles = (rawBattles ?? [])
    .map((p) => ({
      ...p,
      win_rate: Math.round((p.battles_won / p.battles_played) * 100),
      losses: p.battles_played - p.battles_won,
    }))
    .sort((a, b) => {
      if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate
      if (b.battles_played !== a.battles_played) return b.battles_played - a.battles_played
      return b.battles_won - a.battles_won
    })
    .slice(0, 100)

  return (
    <LeaderboardClient
      topCoins={topCoins ?? []}
      topPredictions={topPredictions ?? []}
      topBattles={topBattles}
      currentUserId={user.id}
    />
  )
}
