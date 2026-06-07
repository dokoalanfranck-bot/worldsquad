import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from './LeaderboardClient'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: topCoins }, { data: topPredictions }] = await Promise.all([
    supabase
      .from('users')
      .select('id, pseudo, photo_url, nation, coins, predictions_correct, battles_won')
      .order('coins', { ascending: false })
      .limit(100),
    supabase
      .from('users')
      .select('id, pseudo, photo_url, nation, coins, predictions_correct, battles_won')
      .order('predictions_correct', { ascending: false })
      .limit(100),
  ])

  return (
    <LeaderboardClient
      topCoins={topCoins ?? []}
      topPredictions={topPredictions ?? []}
      currentUserId={user!.id}
    />
  )
}
