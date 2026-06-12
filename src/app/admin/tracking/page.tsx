import { createAdminClient } from '@/lib/supabase/admin'
import { TrackingClient } from './TrackingClient'

export const dynamic = 'force-dynamic'

export default async function TrackingPage() {
  const admin = createAdminClient()

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)
  const todayStr = todayStart.toISOString()
  const weekStr = weekStart.toISOString()
  const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const last24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: newUsersToday },
    { count: newUsersWeek },
    { count: vipCount },
    { count: onlineCount },
    { count: totalDuels },
    { count: duelsToday },
    { count: activeDuels },
    { count: botDuelsToday },
    { count: totalPredictions },
    { count: predictionsToday },
    { count: totalUserCards },
    { count: purchasesToday },
    { data: recentSignups },
    { data: recentDuels },
    { data: recentPredictions },
    { data: recentPurchases },
    { data: topUsers },
    { data: coinStats },
    { data: duelsByHour },
    { data: onlineUsers },
  ] = await Promise.all([
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekStr),
    admin.from('users').select('*', { count: 'exact', head: true }).eq('is_vip', true),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('last_seen_at', onlineThreshold),
    admin.from('duels').select('*', { count: 'exact', head: true }),
    admin.from('duels').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
    admin.from('duels').select('*', { count: 'exact', head: true }).in('status', ['open', 'picking']),
    admin.from('duels').select('*', { count: 'exact', head: true }).gte('created_at', todayStr).eq('is_bot', true),
    admin.from('predictions').select('*', { count: 'exact', head: true }),
    admin.from('predictions').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
    admin.from('user_cards').select('*', { count: 'exact', head: true }),
    admin.from('purchases').select('*', { count: 'exact', head: true }).gte('created_at', todayStr).eq('status', 'completed'),
    // Recent signups
    admin.from('users').select('id, pseudo, nation, photo_url, is_vip, coins, created_at').order('created_at', { ascending: false }).limit(15),
    // Recent finished duels
    admin.from('duels')
      .select('id, created_at, is_bot, bot_name, challenger_score, opponent_score, winner_id, coins_stake, challenger_id, opponent_id')
      .eq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(20),
    // Recent predictions
    admin.from('predictions').select('id, user_id, created_at, status, coins_won').order('created_at', { ascending: false }).limit(15),
    // Recent purchases
    admin.from('purchases').select('id, user_id, pack_type, coins_granted, amount_paid, status, created_at').order('created_at', { ascending: false }).limit(10),
    // Top users by engagement
    admin.from('users')
      .select('id, pseudo, nation, photo_url, is_vip, coins, battles_won, battles_played, predictions_correct, battle_streak, best_streak, created_at, last_seen_at')
      .order('battles_played', { ascending: false })
      .limit(50),
    // Coin transactions today
    admin.from('coin_transactions').select('amount, reason').gte('created_at', todayStr),
    // Duels last 24h for activity graph
    admin.from('duels').select('created_at').gte('created_at', last24h).order('created_at', { ascending: true }),
    // Online users (last 5 min)
    admin.from('users')
      .select('id, pseudo, nation, photo_url, is_vip, last_seen_at, battles_played')
      .gte('last_seen_at', onlineThreshold)
      .order('last_seen_at', { ascending: false })
      .limit(50),
  ])

  // Enrich recent duels with challenger pseudo
  const challengerIds = Array.from(new Set((recentDuels ?? []).map((d) => d.challenger_id)))
  const { data: challengerProfiles } = challengerIds.length
    ? await admin.from('users').select('id, pseudo').in('id', challengerIds)
    : { data: [] }
  const profileMap = Object.fromEntries((challengerProfiles ?? []).map((p) => [p.id, p.pseudo]))

  const enrichedDuels = (recentDuels ?? []).map((d) => ({
    ...d,
    challenger_pseudo: profileMap[d.challenger_id] ?? '?',
    opponent_pseudo: d.is_bot ? (d.bot_name ?? 'Bot') : (profileMap[d.opponent_id ?? ''] ?? '?'),
  }))

  // Coin stats
  const coinsIn = (coinStats ?? []).filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const coinsOut = (coinStats ?? []).filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  // Duels per hour bucket (last 24h)
  const hourBuckets: Record<number, number> = {}
  for (let h = 0; h < 24; h++) hourBuckets[h] = 0
  for (const d of duelsByHour ?? []) {
    const h = new Date(d.created_at).getHours()
    hourBuckets[h] = (hourBuckets[h] ?? 0) + 1
  }
  const duelChart = Object.entries(hourBuckets).map(([h, count]) => ({ hour: Number(h), count }))

  return (
    <TrackingClient
      stats={{
        totalUsers: totalUsers ?? 0,
        newUsersToday: newUsersToday ?? 0,
        newUsersWeek: newUsersWeek ?? 0,
        vipCount: vipCount ?? 0,
        onlineCount: onlineCount ?? 0,
        totalDuels: totalDuels ?? 0,
        duelsToday: duelsToday ?? 0,
        activeDuels: activeDuels ?? 0,
        botDuelsToday: botDuelsToday ?? 0,
        totalPredictions: totalPredictions ?? 0,
        predictionsToday: predictionsToday ?? 0,
        totalUserCards: totalUserCards ?? 0,
        purchasesToday: purchasesToday ?? 0,
        coinsIn,
        coinsOut,
      }}
      recentSignups={recentSignups ?? []}
      recentDuels={enrichedDuels}
      recentPredictions={recentPredictions ?? []}
      recentPurchases={recentPurchases ?? []}
      topUsers={(topUsers ?? []).map((u) => ({
        ...u,
        win_rate: u.battles_played > 0 ? Math.round((u.battles_won / u.battles_played) * 100) : 0,
        losses: u.battles_played - u.battles_won,
      }))}
      onlineUsers={onlineUsers ?? []}
      duelChart={duelChart}
      fetchedAt={now.toISOString()}
    />
  )
}
