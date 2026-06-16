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
  const onlineThreshold = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
  const yesterdayStr = new Date(todayStart.getTime() - 24 * 3600 * 1000).toISOString()
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
    // Purchases (ancien système Stripe)
    { count: purchasesToday },
    { count: purchasesTotal },
    // Payment requests (nouveau système OM/MTN)
    { count: payReqPending },
    { count: payReqApprovedToday },
    { count: payReqApprovedTotal },
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
    { data: recentPaymentRequests },
    { data: payReqRevenueToday },
    { data: payReqRevenueTotal },
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
    // Penalty battles
    { count: totalPenalties },
    { count: penaltiesToday },
    { count: activePenalties },
    { count: penaltiesFinished },
    { data: penaltiesByHour },
    { data: penaltiesByDay },
    { data: recentPenaltiesRaw },
    { data: activePenaltiesRaw },
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
    // Purchases (ancien système Stripe)
    admin.from('purchases').select('*', { count: 'exact', head: true }).gte('created_at', todayStr).eq('status', 'completed'),
    admin.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    // Payment requests (nouveau système OM/MTN)
    admin.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('reviewed_at', todayStr),
    admin.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
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
    admin.from('payment_requests').select('id, user_id, pack_name, pack_type, amount_fcfa, coins_to_credit, payment_method, status, reviewed_at, created_at').order('created_at', { ascending: false }).limit(20),
    admin.from('payment_requests').select('amount_fcfa').eq('status', 'approved').gte('reviewed_at', todayStr),
    admin.from('payment_requests').select('amount_fcfa').eq('status', 'approved'),
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
    // Penalty battles
    admin.from('penalty_battles').select('*', { count: 'exact', head: true }),
    admin.from('penalty_battles').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
    admin.from('penalty_battles').select('*', { count: 'exact', head: true }).in('status', ['waiting', 'picking', 'active']),
    admin.from('penalty_battles').select('*', { count: 'exact', head: true }).eq('status', 'finished'),
    admin.from('penalty_battles').select('created_at').gte('created_at', last24h).order('created_at', { ascending: true }),
    admin.from('penalty_battles').select('created_at').gte('created_at', weekStr).order('created_at', { ascending: true }),
    admin.from('penalty_battles').select('id, created_at, status, challenger_score, opponent_score, winner_id, current_round, challenger_id, opponent_id').in('status', ['finished', 'stealing']).order('created_at', { ascending: false }).limit(20),
    admin.from('penalty_battles').select('id, created_at, status, challenger_id, opponent_id, current_round, challenger_score, opponent_score').in('status', ['waiting', 'picking', 'active']).order('created_at', { ascending: false }).limit(10),
  ])

  const [
    { count: newUsersYesterday },
    { count: duelsYesterday },
    { count: predictionsYesterday },
    { count: penaltiesYesterday },
  ] = await Promise.all([
    admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayStr).lt('created_at', todayStr),
    admin.from('duels').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayStr).lt('created_at', todayStr),
    admin.from('predictions').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayStr).lt('created_at', todayStr),
    admin.from('penalty_battles').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayStr).lt('created_at', todayStr),
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

  // Penalty hourly chart
  const penaltyHourBuckets: Record<number, number> = {}
  for (let h = 0; h < 24; h++) penaltyHourBuckets[h] = 0
  for (const p of penaltiesByHour ?? []) {
    const h = new Date(p.created_at).getHours()
    penaltyHourBuckets[h] = (penaltyHourBuckets[h] ?? 0) + 1
  }
  const penaltyChart = Object.entries(penaltyHourBuckets).map(([h, count]) => ({ hour: Number(h), count }))

  // 7-day side-by-side chart for modes
  const duelDayBuckets: Record<string, number> = {}
  const penaltyDayBuckets: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0)
    const key = d.toISOString().split('T')[0]
    duelDayBuckets[key] = 0
    penaltyDayBuckets[key] = 0
  }
  // Reuse usersByDay query range for duels (already fetched duelsByHour last24h)
  // Use fresh 7-day data from penaltiesByDay
  for (const u of usersByDay ?? []) {
    const day = new Date(u.created_at).toISOString().split('T')[0]
    if (day in duelDayBuckets) duelDayBuckets[day]++
  }
  for (const p of penaltiesByDay ?? []) {
    const day = new Date(p.created_at).toISOString().split('T')[0]
    if (day in penaltyDayBuckets) penaltyDayBuckets[day]++
  }
  const modeChart7d = Object.keys(duelDayBuckets).map((date) => ({
    date,
    duels: duelDayBuckets[date],
    penalties: penaltyDayBuckets[date],
  }))

  // Enrich recent penalty battles
  const penaltyUserIds = Array.from(new Set([
    ...(recentPenaltiesRaw ?? []).map((p) => p.challenger_id),
    ...(recentPenaltiesRaw ?? []).filter((p) => p.opponent_id).map((p) => p.opponent_id as string),
  ].filter(Boolean)))
  const { data: penaltyProfiles } = penaltyUserIds.length
    ? await admin.from('users').select('id, pseudo').in('id', penaltyUserIds)
    : { data: [] }
  const penProfileMap = Object.fromEntries((penaltyProfiles ?? []).map((p) => [p.id, p.pseudo]))
  const recentPenalties = (recentPenaltiesRaw ?? []).map((p) => ({
    id: p.id,
    created_at: p.created_at,
    status: p.status as string,
    challenger_score: p.challenger_score as number,
    opponent_score: p.opponent_score as number,
    winner_id: p.winner_id as string | null,
    current_round: p.current_round as number,
    challenger_pseudo: penProfileMap[p.challenger_id as string] ?? '?',
    opponent_pseudo: p.opponent_id ? (penProfileMap[p.opponent_id as string] ?? '?') : '—',
    challenger_id: p.challenger_id as string,
  }))

  // Enrich active penalty battles
  const activePenUserIds = Array.from(new Set([
    ...(activePenaltiesRaw ?? []).map((p) => p.challenger_id),
    ...(activePenaltiesRaw ?? []).filter((p) => p.opponent_id).map((p) => p.opponent_id as string),
  ].filter(Boolean)))
  const { data: activePenProfiles } = activePenUserIds.length
    ? await admin.from('users').select('id, pseudo').in('id', activePenUserIds)
    : { data: [] }
  const activePenMap = Object.fromEntries((activePenProfiles ?? []).map((p) => [p.id, p.pseudo]))
  const activePenaltiesList = (activePenaltiesRaw ?? []).map((p) => ({
    id: p.id,
    created_at: p.created_at,
    status: p.status as string,
    current_round: p.current_round as number,
    challenger_pseudo: activePenMap[p.challenger_id as string] ?? '?',
    opponent_pseudo: p.opponent_id ? (activePenMap[p.opponent_id as string] ?? '?') : 'En attente…',
  }))

  const revenueToday = (recentPurchases ?? [])
    .filter((p) => p.status === 'completed' && new Date(p.created_at) >= todayStart)
    .reduce((s, p) => s + p.amount_paid / 100, 0)

  const revenueFcfaToday = (payReqRevenueToday ?? []).reduce((s, r) => s + (r.amount_fcfa ?? 0), 0)
  const revenueFcfaTotal = (payReqRevenueTotal ?? []).reduce((s, r) => s + (r.amount_fcfa ?? 0), 0)

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
        payReqPending: payReqPending ?? 0,
        payReqApprovedToday: payReqApprovedToday ?? 0,
        payReqApprovedTotal: payReqApprovedTotal ?? 0,
        revenueFcfaToday,
        revenueFcfaTotal,
        coinsIn,
        coinsOut,
        missionsPredictionDone: missionsPredictionDone ?? 0,
        missionsPackDone: missionsPackDone ?? 0,
        missionsBattleWon: missionsBattleWon ?? 0,
        missionsBonusClaimed: missionsBonusClaimed ?? 0,
        flashClaimsToday: flashClaimsToday ?? 0,
        cardsBySource,
        reasonBreakdown,
        newUsersYesterday: newUsersYesterday ?? 0,
        duelsYesterday: duelsYesterday ?? 0,
        predictionsYesterday: predictionsYesterday ?? 0,
        // Penalty
        totalPenalties: totalPenalties ?? 0,
        penaltiesToday: penaltiesToday ?? 0,
        penaltiesYesterday: penaltiesYesterday ?? 0,
        activePenalties: activePenalties ?? 0,
        penaltiesFinished: penaltiesFinished ?? 0,
      }}
      recentSignups={recentSignups ?? []}
      recentDuels={recentDuels}
      recentPredictions={recentPredictions ?? []}
      recentPurchases={recentPurchases ?? []}
      recentPaymentRequests={recentPaymentRequests ?? []}
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
      penaltyChart={penaltyChart}
      modeChart7d={modeChart7d}
      recentPenalties={recentPenalties}
      activePenaltiesList={activePenaltiesList}
      fetchedAt={now.toISOString()}
    />
  )
}
