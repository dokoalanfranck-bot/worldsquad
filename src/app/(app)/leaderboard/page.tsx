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

  const [
    { data: topPredictionsRaw },
    { data: rawBattles },
    { data: rawDailyBattles },
    { data: cardCountsRaw },
    { data: predStats },
  ] = await Promise.all([
    admin
      .from('users')
      .select('id, pseudo, photo_url, nation, predictions_correct')
      .eq('is_admin', false)
      .order('predictions_correct', { ascending: false })
      .limit(100),
    admin
      .from('users')
      .select('id, pseudo, photo_url, nation, battles_won, battles_played, battle_streak, best_streak')
      .eq('is_admin', false)
      .gt('battles_won', 0)
      .order('battles_won', { ascending: false })
      .limit(100),
    admin
      .from('users')
      .select('id, pseudo, photo_url, nation, daily_battles_won, battles_played, battle_streak, best_streak')
      .eq('is_admin', false)
      .gt('daily_battles_won', 0)
      .order('daily_battles_won', { ascending: false })
      .limit(100),
    admin
      .from('user_card_counts')
      .select('user_id, total_cards, unique_cards')
      .order('total_cards', { ascending: false })
      .limit(100),
    admin
      .from('predictions')
      .select('user_id, status')
      .neq('status', 'pending'),
  ])

  // Battles all-time
  const topBattles = (rawBattles ?? [])
    .map((p) => ({ ...p, losses: p.battles_played - p.battles_won }))
    .sort((a, b) => b.battles_won !== a.battles_won ? b.battles_won - a.battles_won : b.battles_played - a.battles_played)
    .slice(0, 100)

  // Battles daily
  const topDailyBattles = (rawDailyBattles ?? [])
    .map((p) => ({ ...p, losses: p.battles_played - p.daily_battles_won, battles_won: p.daily_battles_won }))
    .sort((a, b) => b.battles_won - a.battles_won)
    .slice(0, 100)

  // Predictions — add wrong count per user
  const predWrongMap = new Map<string, number>()
  const predTotalMap = new Map<string, number>()
  for (const p of predStats ?? []) {
    predTotalMap.set(p.user_id, (predTotalMap.get(p.user_id) ?? 0) + 1)
    if (p.status === 'wrong') {
      predWrongMap.set(p.user_id, (predWrongMap.get(p.user_id) ?? 0) + 1)
    }
  }
  const topPredictions = (topPredictionsRaw ?? []).map((u) => ({
    ...u,
    predictions_wrong: predWrongMap.get(u.id) ?? 0,
    predictions_total: predTotalMap.get(u.id) ?? u.predictions_correct,
  }))

  // Cards — via vue user_card_counts (total = classement, unique = affichage)
  const topCardUserIds = (cardCountsRaw ?? []).map((r) => r.user_id)
  const { data: cardUsers } = topCardUserIds.length > 0
    ? await admin.from('users').select('id, pseudo, photo_url, nation').eq('is_admin', false).in('id', topCardUserIds)
    : { data: [] }

  const cardUsersMap = new Map((cardUsers ?? []).map((u) => [u.id, u]))
  const topCards = (cardCountsRaw ?? [])
    .map((row) => {
      const u = cardUsersMap.get(row.user_id)
      if (!u) return null
      return { ...u, total_cards: row.total_cards as number, unique_cards: row.unique_cards as number }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return (
    <LeaderboardClient
      topPredictions={topPredictions}
      topBattles={topBattles}
      topDailyBattles={topDailyBattles}
      topCards={topCards}
      currentUserId={user.id}
    />
  )
}
