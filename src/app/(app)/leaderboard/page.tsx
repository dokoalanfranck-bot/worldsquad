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
    { data: allUserCards },
    { data: predStats },
  ] = await Promise.all([
    admin
      .from('users')
      .select('id, pseudo, photo_url, nation, predictions_correct')
      .order('predictions_correct', { ascending: false })
      .limit(100),
    admin
      .from('users')
      .select('id, pseudo, photo_url, nation, battles_won, battles_played, battle_streak, best_streak')
      .gt('battles_won', 0)
      .limit(200),
    admin
      .from('user_cards')
      .select('user_id, card_id')
      .limit(10000),
    admin
      .from('predictions')
      .select('user_id, status')
      .neq('status', 'pending'),
  ])

  // Battles — sorted by victories count
  const topBattles = (rawBattles ?? [])
    .map((p) => ({
      ...p,
      losses: p.battles_played - p.battles_won,
    }))
    .sort((a, b) => {
      if (b.battles_won !== a.battles_won) return b.battles_won - a.battles_won
      return b.battles_played - a.battles_played
    })
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

  // Cards — count distinct card_id per user
  const cardCountMap = new Map<string, Set<string>>()
  for (const uc of allUserCards ?? []) {
    if (!cardCountMap.has(uc.user_id)) cardCountMap.set(uc.user_id, new Set())
    cardCountMap.get(uc.user_id)!.add(uc.card_id)
  }
  const sortedCardEntries = Array.from(cardCountMap.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 100)

  const topCardUserIds = sortedCardEntries.map(([id]) => id)
  const { data: cardUsers } = topCardUserIds.length > 0
    ? await admin.from('users').select('id, pseudo, photo_url, nation').in('id', topCardUserIds)
    : { data: [] }

  const cardUsersMap = new Map((cardUsers ?? []).map((u) => [u.id, u]))
  const topCards = sortedCardEntries
    .map(([userId, cards]) => {
      const u = cardUsersMap.get(userId)
      if (!u) return null
      return { ...u, unique_cards: cards.size }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return (
    <LeaderboardClient
      topPredictions={topPredictions}
      topBattles={topBattles}
      topCards={topCards}
      currentUserId={user.id}
    />
  )
}
