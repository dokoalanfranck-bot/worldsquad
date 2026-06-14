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
  const last24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
  const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const todayDate = todayStart.toISOString().split('T')[0]

  const [
    // Users
    { count: totalUsers },
    { count: newUsersToday },
    { count: newUsersWeek },
    { count: vipCount },
    { count: onlineCount },
    { count: pushSubscribers },
    // Duels
    { count: totalDuels },
    { count: duelsToday },
    { count: activeDuels },
    { count: botDuelsToday },
    // Predictions
    { count: totalPredictions },
    { count: predictionsToday },
    { count: correctScoreToday },
    { count: correctWinnerToday },
    { count: wrongToday },
    { count: pendingPredictions },
    // Cards
    { count: totalUserCards },
    { count: cardsFromPacksToday },
    { count: cardsFromBattleToday },
    // Purchases
    { count: purchasesToday },
    { count: purchasesTotal },
    // Missions today
    { count: missionsPredictionDone },
    { count: missionsPackDone },
    { count: missionsBattleWon },
    { count: missionsBonusClaimed },
    // Flash challenges
    { count: flashClaimsToday },
    // Recent data feeds
    { data: recentSignups },
    { data: recentDuelsRaw },
    { data: recentPredictions },
    { data: recentPurchases },
    { data: topUsers },
    { data: coinStatsToday },
    { data: recentTransactions },
    // Charts
    { data: duelsByHour },
    { data: packsByHour },
    { data: usersByDay },
    // Online & active
    { data: onlineUsers },
    { data: activeDuelsRaw },
    // Card source breakdown
    { data: cardsByVia },
  ] = await Promise.all([
    // Users
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekStr),
    admin.from('users').select('*', { count: 'exact', head: true }).eq('is_vip', true),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('last_seen_at', onlineThreshold),
    admin.from('push_subscriptions').select('*', { count: 'exact', head: true }),
    // Duels
    admin.from('duels').select('*', { count: 'exact', head: true }),
    admin.from('duels').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
    admin.from('duels').select('*', { count: 'exact', head: true }).in('status', ['open', 'picking']),
    admin.from('duels').select('*', { count: 'exact', head: true }).gte('created_at', todayStr).eq('is_bot', true),
    // Predictions
    admin.from('predictions').select('*', { count: 'exact', head: true }),
    admin.from('predictions').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
    admin.from('predictions').select('*', { count: 'exact', head: true }).gte('created_at', todayStr).eq('status', 'correct_score'),
    admin.from('predictions').select('*', { count: 'exact', head: true }).gte('created_at', todayStr).eq('status', 'correct_winner'),
    admin.from('predictions').select('*', { count: 'exact', head: true }).gte('created_at', todayStr).eq('status', 'wrong'),
    admin.from('predictions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    // Cards
    admin.from('user_cards').select('*', { count: 'exact', head: true }),
    admin.from('user_cards').select('*', { count: 'exact', head: true }).gte('obtained_at', todayStr).eq('obtained_via', 'pack'),
    admin.from('user_cards').select('*', { count: 'exact', head: true }).gte('obtained_at', todayStr).eq('obtained_via', 'battle'),
    // Purchases
    admin.from('purchases').select('*', { count: 'exact', head: true }).gte('created_at', todayStr).eq('status', 'completed'),
    admin.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    // Missions today
    admin.from('daily_missions').select('*', { count: 'exact', head: true }).eq('date', todayDate).eq('prediction_done', true),
    admin.from('daily_missions').select('*', { count: 'exact', head: true }).eq('date', todayDate).eq('pack_done', true),
    admin.from('daily_missions').select('*', { count: 'exact', head: true }).eq('date', todayDate).eq('battle_won', true),
    admin.from('daily_missions').select('*', { count: 'exact', head: true }).eq('date', todayDate).eq('bonus_claimed', true),
    // Flash claims today
    admin.from('flash_challenge_claims').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
    // Feeds
    admin.from('users').select('id, pseudo, nation, photo_url, is_vip, coins, created_at').order('created_at', { ascending: false }).limit(20),
    admin.from('duels').select('id, created_at, is_bot, bot_name, challenger_score, opponent_score, winner_id, coins_stake, challenger_id, opponent_id, status').eq('status', 'finished').order('created_at', { ascending: false }).limit(30),
    admin.from('predictions').select('id, user_id, created_at, status, coins_won').order('created_at', { ascending: false }).limit(20),
    admin.from('purchases').select('id, user_id, pack_type, coins_granted, amount_paid, status, created_at').order('created_at', { ascending: false }).limit(15),
    admin.from('users').select('id, pseudo, nation, photo_url, is_vip, coins, battles_won, battles_played, predictions_correct, battle_streak, best_streak, created_at, last_seen_at, daily_streak').order('battles_played', { ascending: false }).limit(100),
    admin.from('coin_transactions').select('amount, reason').gte('created_at', todayStr),
    admin.from('coin_transactions').select('id, user_id, amount, reason, created_at').order('created_at', { ascending: false }).limit(60),
    // Charts
    admin.from('duels').select('created_at').gte('created_at', last24h).order('created_at', { ascending: true }),
    admin.from('user_cards').select('obtained_at').eq('obtained_via', 'pack').gte('obtained_at', last24h).order('obtained_at', { ascending: true }),
    admin.from('users').select('created_at').gte('created_at', weekStr).order('created_at', { ascending: true }),
    // Online & active
    admin.from('users').select('id, pseudo, nation, photo_url, is_vip, last_seen_at, battles_played').gte('last_seen_at', onlineThreshold).order('last_seen_at', { ascending: false }).limit(50),
    admin.from('duels').select('id, created_at, is_bot, bot_name, challenger_id, opponent_id, status, coins_stake').in('status', ['open', 'picking']).order('created_at', { ascending: false }).limit(20),
    // Card source breakdown today
    admin.from('user_cards').select('obtained_via').gte('obtained_at', todayStr),
  ])

  // Enrich recent finished duels
  const allDuelUserIds = Array.from(new Set([
    ...(recentDuelsRaw ?? []).map((d) => d.challenger_id),
    ...(recentDuelsRaw ?? []).filter((d) => !d.is_bot && d.opponent_id).map((d) => d.opponent_id as string),
  ].filter(Boolean)))
  const { data: duelProfiles } = allDuelUserIds.length
    ? await admin.from('users').select('id, pseudo').in('id', allDuelUserIds)
    : { data: [] }
  const profileMap = Object.fromEntries((duelProfiles ?? []).map((p) => [p.id, p.pseudo]))
  const recentDuels = (recentDuelsRaw ?? []).map((d) => ({
    ...d,
    challenger_pseudo: profileMap[d.challenger_id] ?? '?',
    opponent_pseudo: d.is_bot ? (d.bot_name ?? 'Bot') : (profileMap[d.opponent_id ?? ''] ?? '?'),
  }))

  // Enrich active duels
  const activeUserIds = Array.from(new Set([
    ...(activeDuelsRaw ?? []).map((d) => d.challenger_id),
    ...(activeDuelsRaw ?? []).filter((d) => !d.is_bot && d.opponent_id).map((d) => d.opponent_id as string),
  ].filter(Boolean)))
  const { data: activeProfiles } = activeUserIds.length
    ? await admin.from('users').select('id, pseudo').in('id', activeUserIds)
    : { data: [] }
  const activeProfileMap = Object.fromEntries((activeProfiles ?? []).map((p) => [p.id, p.pseudo]))
  const activeDuelsList = (activeDuelsRaw ?? []).map((d) => ({
    id: d.id,
    status: d.status,
    coins_stake: d.coins_stake,
    created_at: d.created_at,
    is_bot: d.is_bot,
    challenger_pseudo: activeProfileMap[d.challenger_id] ?? '?',
    opponent_pseudo: d.is_bot ? (d.bot_name ?? 'Bot') : (d.opponent_id ? (activeProfileMap[d.opponent_id] ?? '?') : 'En attente…'),
  }))

  // Coin stats
  const coinsIn = (coinStatsToday ?? []).filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const coinsOut = (coinStatsToday ?? []).filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  // Coin breakdown by reason category
  const reasonBreakdown: Record<string, { in: number; out: number; count: number }> = {}
  for (const t of coinStatsToday ?? []) {
    let category = 'Autre'
    if (t.reason?.startsWith('Ouverture')) category = 'Ouverture pack'
    else if (t.reason?.startsWith('Récompense quotidienne')) category = 'Récompense quotidienne'
    else if (t.reason?.startsWith('⚡ Défi Flash')) category = 'Défi Flash'
    else if (t.reason?.startsWith('Mission du jour')) category = 'Mission'
    else if (t.reason?.startsWith('Bonus missions')) category = 'Bonus missions'
    else if (t.reason?.startsWith('Bonus installation')) category = 'Installation'
    else if (t.reason?.startsWith('Remboursement')) category = 'Remboursement'
    else if (t.reason?.toLowerCase().includes('duel') || t.reason?.toLowerCase().includes('battle')) category = 'Duel'
    else if (t.reason?.toLowerCase().includes('prono') || t.reason?.toLowerCase().includes('prediction')) category = 'Pronostic'
    if (!reasonBreakdown[category]) reasonBreakdown[category] = { in: 0, out: 0, count: 0 }
    if (t.amount > 0) reasonBreakdown[category].in += t.amount
    else reasonBreakdown[category].out += Math.abs(t.amount)
    reasonBreakdown[category].count++
  }

  // Charts
  const duelHourBuckets: Record<number, number> = {}
  for (let h = 0; h < 24; h++) duelHourBuckets[h] = 0
  for (const d of duelsByHour ?? []) {
    const h = new Date(d.created_at).getHours()
    duelHourBuckets[h] = (duelHourBuckets[h] ?? 0) + 1
  }
  const duelChart = Object.entries(duelHourBuckets).map(([h, count]) => ({ hour: Number(h), count }))

  const packHourBuckets: Record<number, number> = {}
  for (let h = 0; h < 24; h++) packHourBuckets[h] = 0
  for (const c of packsByHour ?? []) {
    const h = new Date(c.obtained_at).getHours()
    packHourBuckets[h] = (packHourBuckets[h] ?? 0) + 1
  }
  const packChart = Object.entries(packHourBuckets).map(([h, count]) => ({ hour: Number(h), count }))

  const dayBuckets: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0)
    dayBuckets[d.toISOString().split('T')[0]] = 0
  }
  for (const u of usersByDay ?? []) {
    const day = new Date(u.created_at).toISOString().split('T')[0]
    if (day in dayBuckets) dayBuckets[day]++
  }
  const signupChart = Object.entries(dayBuckets).map(([date, count]) => ({ date, count }))

  const cardsBySource: Record<string, number> = {}
  for (const c of cardsByVia ?? []) {
    const key = c.obtained_via ?? 'unknown'
    cardsBySource[key] = (cardsBySource[key] ?? 0) + 1
  }

  const revenueToday = (recentPurchases ?? [])
    .filter((p) => p.status === 'completed' && new Date(p.created_at) >= todayStart)
    .reduce((s, p) => s + p.amount_paid / 100, 0)

  return (
    <TrackingClient
      stats={{
        totalUsers: totalUsers ?? 0,
        newUsersToday: newUsersToday ?? 0,
        newUsersWeek: newUsersWeek ?? 0,
        vipCount: vipCount ?? 0,
        onlineCount: onlineCount ?? 0,
        pushSubscribers: pushSubscribers ?? 0,
        totalDuels: totalDuels ?? 0,
        duelsToday: duelsToday ?? 0,
        activeDuels: activeDuels ?? 0,
        botDuelsToday: botDuelsToday ?? 0,
        totalPredictions: totalPredictions ?? 0,
        predictionsToday: predictionsToday ?? 0,
        correctScoreToday: correctScoreToday ?? 0,
        correctWinnerToday: correctWinnerToday ?? 0,
        wrongToday: wrongToday ?? 0,
        pendingPredictions: pendingPredictions ?? 0,
        totalUserCards: totalUserCards ?? 0,
        cardsFromPacksToday: cardsFromPacksToday ?? 0,
        cardsFromBattleToday: cardsFromBattleToday ?? 0,
        purchasesToday: purchasesToday ?? 0,
        purchasesTotal: purchasesTotal ?? 0,
        revenueToday,
        coinsIn,
        coinsOut,
        missionsPredictionDone: missionsPredictionDone ?? 0,
        missionsPackDone: missionsPackDone ?? 0,
        missionsBattleWon: missionsBattleWon ?? 0,
        missionsBonusClaimed: missionsBonusClaimed ?? 0,
        flashClaimsToday: flashClaimsToday ?? 0,
        cardsBySource,
        reasonBreakdown,
      }}
      recentSignups={recentSignups ?? []}
      recentDuels={recentDuels}
      recentPredictions={recentPredictions ?? []}
      recentPurchases={recentPurchases ?? []}
      recentTransactions={recentTransactions ?? []}
      topUsers={(topUsers ?? []).map((u) => ({
        ...u,
        win_rate: u.battles_played > 0 ? Math.round((u.battles_won / u.battles_played) * 100) : 0,
        losses: u.battles_played - u.battles_won,
      }))}
      onlineUsers={onlineUsers ?? []}
      activeDuelsList={activeDuelsList}
      duelChart={duelChart}
      packChart={packChart}
      signupChart={signupChart}
      fetchedAt={now.toISOString()}
    />
  )
}
