'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Swords, Target, Package,
  TrendingUp, TrendingDown, RefreshCw,
  Crown, Zap, Activity, UserPlus, ShoppingBag,
  Clock, Bell, CheckCircle, XCircle, Star, Coins, Radio,
  ChevronRight, Flame, Bot,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number; newUsersToday: number; newUsersWeek: number; vipCount: number
  onlineCount: number; pushSubscribers: number
  totalDuels: number; duelsToday: number; activeDuels: number; botDuelsToday: number
  totalPredictions: number; predictionsToday: number
  correctScoreToday: number; correctWinnerToday: number; wrongToday: number; pendingPredictions: number
  totalUserCards: number; cardsFromPacksToday: number; cardsFromBattleToday: number
  purchasesToday: number; purchasesTotal: number; revenueToday: number
  payReqPending: number; payReqApprovedToday: number; payReqApprovedTotal: number
  revenueFcfaToday: number; revenueFcfaTotal: number
  coinsIn: number; coinsOut: number
  missionsPredictionDone: number; missionsPackDone: number; missionsBattleWon: number; missionsBonusClaimed: number
  flashClaimsToday: number
  cardsBySource: Record<string, number>
  reasonBreakdown: Record<string, { in: number; out: number; count: number }>
  newUsersYesterday: number; duelsYesterday: number; predictionsYesterday: number
}
interface OnlineUser { id: string; pseudo: string; nation: string; photo_url: string | null; is_vip: boolean; last_seen_at: string; battles_played: number }
interface ActiveDuel { id: string; challenger_pseudo: string; opponent_pseudo: string; is_bot: boolean; status: string; coins_stake: number; created_at: string }
interface SignupRow { id: string; pseudo: string; nation: string; photo_url: string | null; is_vip: boolean; coins: number; created_at: string }
interface DuelRow { id: string; created_at: string; is_bot: boolean; challenger_pseudo: string; opponent_pseudo: string; challenger_score: number | null; opponent_score: number | null; winner_id: string | null; coins_stake: number; challenger_id: string }
interface PredictionRow { id: string; user_id: string; created_at: string; status: string; coins_won: number }
interface PurchaseRow { id: string; user_id: string; pack_type: string; coins_granted: number; amount_paid: number; status: string; created_at: string }
interface PaymentRequestRow { id: string; user_id: string; pack_name: string; pack_type: string; amount_fcfa: number; coins_to_credit: number; payment_method: string; status: string; reviewed_at: string | null; created_at: string }
interface TransactionRow { id: string; user_id: string; amount: number; reason: string; created_at: string }
interface UserRow { id: string; pseudo: string; nation: string; photo_url: string | null; is_vip: boolean; coins: number; battles_won: number; battles_played: number; predictions_correct: number; battle_streak: number; best_streak: number; created_at: string; last_seen_at?: string | null; daily_streak?: number; win_rate: number; losses: number }
interface ChartPoint { hour: number; count: number }
interface DayPoint { date: string; count: number }

interface Props {
  stats: Stats
  recentSignups: SignupRow[]
  recentDuels: DuelRow[]
  recentPredictions: PredictionRow[]
  recentPurchases: PurchaseRow[]
  recentPaymentRequests: PaymentRequestRow[]
  recentTransactions: TransactionRow[]
  topUsers: UserRow[]
  onlineUsers: OnlineUser[]
  activeDuelsList: ActiveDuel[]
  duelChart: ChartPoint[]
  packChart: ChartPoint[]
  signupChart: DayPoint[]
  fetchedAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function trendPct(today: number, yesterday: number): number {
  if (yesterday === 0) return today > 0 ? 100 : 0
  return Math.round(((today - yesterday) / yesterday) * 100)
}

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Morocco: '🇲🇦',
  USA: '🇺🇸', Mexico: '🇲🇽', Japan: '🇯🇵', Senegal: '🇸🇳',
  Netherlands: '🇳🇱', Belgium: '🇧🇪', Croatia: '🇭🇷', Colombia: '🇨🇴',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon,
  accent = 'text-white',
  iconBg = 'bg-white/5',
  trend,
  pulse,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: string
  iconBg?: string
  trend?: number
  pulse?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.025)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${accent}`} />
        </div>
        <div className="flex items-center gap-1.5">
          {pulse && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
          {trend !== undefined && !pulse && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              trend >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
            }`}>
              {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
      <p className={`text-2xl font-black tabular-nums leading-none mb-1 ${accent}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-white/35 text-xs font-medium">{label}</p>
      {sub && <p className="text-white/20 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Bar Chart (24h) ────────────────────────────────────────────────────────────
function BarChart({ data, activeColor = '#F5C518' }: { data: ChartPoint[]; activeColor?: string }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const now = new Date().getHours()
  return (
    <div>
      <div className="flex items-end gap-px h-16">
        {data.map((d) => (
          <div key={d.hour} className="flex-1 group relative">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.4, delay: d.hour * 0.01 }}
              style={{
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 1)}%`,
                background: d.hour === now ? activeColor : `${activeColor}35`,
                transformOrigin: 'bottom',
              }}
              className="w-full rounded-t-sm"
            />
            {d.count > 0 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0D1520] border border-white/10 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {d.count} · {d.hour}h
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        {[0, 4, 8, 12, 16, 20, 23].map((h) => (
          <span key={h} className="text-white/15 text-[9px]">{h}h</span>
        ))}
      </div>
    </div>
  )
}

// ── Day Chart (7d) ─────────────────────────────────────────────────────────────
function DayBarChart({ data, color = '#009ADE' }: { data: DayPoint[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div>
      <div className="flex items-end gap-1 h-16">
        {data.map((d) => (
          <div key={d.date} className="flex-1 group relative">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 1)}%`,
                background: color,
                transformOrigin: 'bottom',
              }}
              className="w-full rounded-t-sm"
            />
            {d.count > 0 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0D1520] border border-white/10 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {d.count}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        {data.map((d) => (
          <span key={d.date} className="text-white/15 text-[9px]">{fmtDate(d.date)}</span>
        ))}
      </div>
    </div>
  )
}

// ── Progress Bar ───────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = '#009ADE', label, count }: {
  value: number; max: number; color?: string; label: string; count: number
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-white/50 text-xs">{label}</span>
        <span className="text-white text-xs font-bold tabular-nums">{count.toLocaleString()} <span className="text-white/25">({pct}%)</span></span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SH({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-white/25" />
        <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{title}</span>
      </div>
      {action}
    </div>
  )
}

// ── Feed event types ───────────────────────────────────────────────────────────
type FeedEvent =
  | { type: 'signup'; id: string; pseudo: string; nation: string; is_vip: boolean; created_at: string }
  | { type: 'duel'; id: string; challenger: string; opponent: string; score: string; is_bot: boolean; created_at: string }
  | { type: 'prediction'; id: string; status: string; coins_won: number; created_at: string }
  | { type: 'purchase'; id: string; pack_type: string; coins_granted: number; created_at: string }
  | { type: 'transaction'; id: string; amount: number; reason: string; created_at: string }

function FeedRow({ ev }: { ev: FeedEvent }) {
  const ago = timeAgo(ev.created_at)

  if (ev.type === 'signup') return (
    <div className="flex items-center gap-2.5 py-2 border-b border-white/4">
      <div className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center flex-shrink-0">
        <UserPlus className="w-2.5 h-2.5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0 flex items-baseline gap-1.5 overflow-hidden">
        <span className="text-white text-xs font-semibold truncate">{ev.pseudo}</span>
        <span className="text-white/30 text-[10px] flex-shrink-0">{flag(ev.nation)} inscription</span>
        {ev.is_vip && <span className="text-[9px] px-1 rounded bg-yellow-500/20 text-yellow-400 font-black flex-shrink-0">VIP</span>}
      </div>
      <span className="text-white/20 text-[10px] tabular-nums flex-shrink-0">{ago}</span>
    </div>
  )

  if (ev.type === 'duel') return (
    <div className="flex items-center gap-2.5 py-2 border-b border-white/4">
      <div className="w-5 h-5 rounded-md bg-orange-500/15 flex items-center justify-center flex-shrink-0">
        <Swords className="w-2.5 h-2.5 text-orange-400" />
      </div>
      <div className="flex-1 min-w-0 flex items-baseline gap-1 overflow-hidden">
        <span className="text-white text-xs font-semibold truncate max-w-[72px]">{ev.challenger}</span>
        <span className="text-white/20 text-[10px] flex-shrink-0">vs</span>
        <span className="text-white/55 text-xs truncate max-w-[72px]">{ev.opponent}</span>
        <span className="text-white/25 text-[10px] tabular-nums flex-shrink-0">{ev.score}</span>
      </div>
      <span className="text-white/20 text-[10px] tabular-nums flex-shrink-0">{ago}</span>
    </div>
  )

  if (ev.type === 'prediction') return (
    <div className="flex items-center gap-2.5 py-2 border-b border-white/4">
      <div className="w-5 h-5 rounded-md bg-green-500/15 flex items-center justify-center flex-shrink-0">
        <Target className="w-2.5 h-2.5 text-green-400" />
      </div>
      <div className="flex-1 min-w-0 text-xs">
        {ev.status === 'correct_score' && <span className="text-green-400 font-semibold">Score exact <span className="text-green-500/70">+{ev.coins_won}🪙</span></span>}
        {ev.status === 'correct_winner' && <span className="text-blue-400 font-semibold">Bon vainqueur <span className="text-blue-500/70">+{ev.coins_won}🪙</span></span>}
        {ev.status === 'wrong' && <span className="text-white/35">Pronostic raté</span>}
        {ev.status === 'pending' && <span className="text-white/20">Pronostic en attente</span>}
      </div>
      <span className="text-white/20 text-[10px] tabular-nums flex-shrink-0">{ago}</span>
    </div>
  )

  if (ev.type === 'purchase') return (
    <div className="flex items-center gap-2.5 py-2 border-b border-white/4">
      <div className="w-5 h-5 rounded-md bg-purple-500/15 flex items-center justify-center flex-shrink-0">
        <ShoppingBag className="w-2.5 h-2.5 text-purple-400" />
      </div>
      <div className="flex-1 min-w-0 text-xs overflow-hidden">
        <span className="text-white font-semibold capitalize">{ev.pack_type}</span>
        <span className="text-white/30 ml-1.5">acheté +{ev.coins_granted}🪙</span>
      </div>
      <span className="text-white/20 text-[10px] tabular-nums flex-shrink-0">{ago}</span>
    </div>
  )

  if (ev.type === 'transaction') {
    const isCredit = ev.amount > 0
    let icon = <Coins className="w-2.5 h-2.5 text-yellow-400" />
    let bg = 'bg-yellow-500/10'
    if (ev.reason?.startsWith('Ouverture')) { icon = <Package className="w-2.5 h-2.5 text-pink-400" />; bg = 'bg-pink-500/10' }
    else if (ev.reason?.startsWith('⚡')) { icon = <Zap className="w-2.5 h-2.5 text-yellow-400" />; bg = 'bg-yellow-500/10' }
    else if (ev.reason?.startsWith('Mission')) { icon = <CheckCircle className="w-2.5 h-2.5 text-green-400" />; bg = 'bg-green-500/10' }
    else if (ev.reason?.startsWith('Récompense')) { icon = <Star className="w-2.5 h-2.5 text-amber-400" />; bg = 'bg-amber-500/10' }
    return (
      <div className="flex items-center gap-2.5 py-2 border-b border-white/4">
        <div className={`w-5 h-5 rounded-md ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <div className="flex-1 min-w-0 text-[10px] text-white/35 truncate">{ev.reason}</div>
        <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
          {isCredit ? '+' : ''}{ev.amount}
        </span>
        <span className="text-white/20 text-[10px] tabular-nums ml-1.5 flex-shrink-0">{ago}</span>
      </div>
    )
  }
  return null
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 7 }: { user: { pseudo: string; photo_url: string | null }; size?: number }) {
  const sz = `w-${size} h-${size}`
  return (
    <div className={`${sz} rounded-full bg-white/10 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0`}>
      {user.photo_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={user.photo_url} alt={user.pseudo} className="w-full h-full object-cover" />
        : user.pseudo[0]?.toUpperCase()}
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
type Tab = 'live' | 'global' | 'duels' | 'packs' | 'pronos' | 'economie' | 'joueurs'
const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'live',     label: 'Live',     emoji: '🔴' },
  { key: 'global',   label: 'Global',   emoji: '📊' },
  { key: 'duels',    label: 'Duels',    emoji: '⚔️' },
  { key: 'packs',    label: 'Packs',    emoji: '📦' },
  { key: 'pronos',   label: 'Pronos',   emoji: '⚽' },
  { key: 'economie', label: 'Économie', emoji: '💰' },
  { key: 'joueurs',  label: 'Joueurs',  emoji: '👥' },
]

// ── MAIN ──────────────────────────────────────────────────────────────────────
export function TrackingClient(props: Props) {
  const {
    stats, recentSignups, recentDuels, recentPredictions,
    recentPurchases, recentPaymentRequests, recentTransactions, topUsers,
    onlineUsers, activeDuelsList, duelChart, packChart, signupChart, fetchedAt,
  } = props

  const router = useRouter()
  const [tab, setTab] = useState<Tab>('live')
  const [refreshing, setRefreshing] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [userSort, setUserSort] = useState<'battles' | 'coins' | 'predictions' | 'recent'>('battles')
  const [search, setSearch] = useState('')

  useEffect(() => { setSecondsAgo(0) }, [fetchedAt])
  useEffect(() => {
    const t = setInterval(() => setSecondsAgo((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [fetchedAt])

  const refresh = useCallback(() => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }, [router])

  useEffect(() => {
    const t = setInterval(refresh, tab === 'live' ? 10000 : 30000)
    return () => clearInterval(t)
  }, [refresh, tab])

  // Unified live feed
  const liveFeed: FeedEvent[] = [
    ...recentSignups.map((u): FeedEvent => ({ type: 'signup', id: u.id, pseudo: u.pseudo, nation: u.nation, is_vip: u.is_vip, created_at: u.created_at })),
    ...recentDuels.map((d): FeedEvent => ({ type: 'duel', id: d.id, challenger: d.challenger_pseudo, opponent: d.opponent_pseudo, score: `${d.challenger_score ?? 0}-${d.opponent_score ?? 0}`, is_bot: d.is_bot, created_at: d.created_at })),
    ...recentPredictions.map((p): FeedEvent => ({ type: 'prediction', id: p.id, status: p.status, coins_won: p.coins_won, created_at: p.created_at })),
    ...recentPurchases.map((p): FeedEvent => ({ type: 'purchase', id: p.id, pack_type: p.pack_type, coins_granted: p.coins_granted, created_at: p.created_at })),
    ...recentTransactions.filter((t) => !t.reason?.startsWith('Remboursement')).map((t): FeedEvent => ({ type: 'transaction', id: t.id, amount: t.amount, reason: t.reason, created_at: t.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 80)

  const botRatio = stats.duelsToday > 0 ? Math.round((stats.botDuelsToday / stats.duelsToday) * 100) : 0
  const predResolved = stats.correctScoreToday + stats.correctWinnerToday + stats.wrongToday
  const predAccuracy = predResolved > 0 ? Math.round(((stats.correctScoreToday + stats.correctWinnerToday) / predResolved) * 100) : 0

  const signupTrend = trendPct(stats.newUsersToday, stats.newUsersYesterday)
  const duelTrend = trendPct(stats.duelsToday, stats.duelsYesterday)
  const predTrend = trendPct(stats.predictionsToday, stats.predictionsYesterday)

  const sortedUsers = [...topUsers]
    .filter((u) => u.pseudo.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (userSort === 'battles') return b.battles_played - a.battles_played
      if (userSort === 'coins') return b.coins - a.coins
      if (userSort === 'predictions') return b.predictions_correct - a.predictions_correct
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const cardStyle = { background: 'rgba(255,255,255,0.025)' }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.04em' }}>
              ANALYTICS
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-[10px] font-bold tracking-wider">LIVE</span>
            </div>
          </div>
          <p className="text-white/20 text-xs mt-0.5">
            Actualisé il y a {secondsAgo}s · auto-refresh {tab === 'live' ? '10s' : '30s'}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 text-white/35 hover:text-white/60 text-xs font-medium transition-all disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Quick KPI strip ── */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: 'En ligne',    value: stats.onlineCount,        color: 'text-green-400',  pulse: true  },
          { label: 'Inscrits',    value: stats.newUsersToday,      color: 'text-sky-400',    pulse: false },
          { label: 'Actifs',      value: stats.activeDuels,        color: 'text-orange-400', pulse: true  },
          { label: 'Duels',       value: stats.duelsToday,         color: 'text-amber-400',  pulse: false },
          { label: 'Pronos',      value: stats.predictionsToday,   color: 'text-emerald-400',pulse: false },
          { label: 'Cartes',      value: stats.cardsFromPacksToday,color: 'text-pink-400',   pulse: false },
          { label: 'Achats',      value: stats.purchasesToday,     color: 'text-violet-400', pulse: false },
          { label: 'Flash',       value: stats.flashClaimsToday,   color: 'text-yellow-400', pulse: false },
        ].map((s) => (
          <div
            key={s.label}
            className="relative rounded-lg border border-white/6 px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            {s.pulse && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            <p className={`text-xl font-black tabular-nums leading-none ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-white/25 text-[10px] mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tab nav ── */}
      <div className="flex overflow-x-auto border-b border-white/8 scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
              tab === t.key
                ? 'text-[#F5C518] border-[#F5C518]'
                : 'text-white/30 border-transparent hover:text-white/55'
            }`}
          >
            <span className="hidden sm:inline">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════════════════════════ LIVE ══════════════════════════════ */}
        {tab === 'live' && (
          <motion.div key="live" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* Left col: online + duels en cours */}
              <div className="lg:col-span-2 space-y-4">

                {/* Online users */}
                <div className="rounded-xl border border-white/6 overflow-hidden" style={cardStyle}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-white text-sm font-bold">{stats.onlineCount} en ligne</span>
                    </div>
                    <span className="text-white/20 text-[10px]">≤ 15 min</span>
                  </div>
                  <div className="p-3 min-h-[60px]">
                    {onlineUsers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {onlineUsers.map((u) => (
                          <Link
                            key={u.id}
                            href={`/admin/users/${u.id}`}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-green-500/15 hover:bg-green-500/10 transition-colors"
                            style={{ background: 'rgba(34,197,94,0.06)' }}
                          >
                            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-black overflow-hidden flex-shrink-0">
                              {u.photo_url
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={u.photo_url} alt={u.pseudo} className="w-full h-full object-cover" />
                                : u.pseudo[0]?.toUpperCase()}
                            </div>
                            <span className="text-white text-xs font-semibold">{u.pseudo}</span>
                            {u.is_vip && <Crown className="w-2.5 h-2.5 text-yellow-400" />}
                            <span className="text-green-500/60 text-[9px] tabular-nums">{timeAgo(u.last_seen_at)}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/20 text-sm text-center py-3">Aucun joueur actif</p>
                    )}
                  </div>
                </div>

                {/* Active duels */}
                <div className="rounded-xl border border-white/6 overflow-hidden" style={cardStyle}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                    <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                    <span className="text-white text-sm font-bold">{stats.activeDuels} duel{stats.activeDuels !== 1 ? 's' : ''} en cours</span>
                  </div>
                  {activeDuelsList.length > 0 ? (
                    <div className="divide-y divide-white/4">
                      {activeDuelsList.map((d) => (
                        <div key={d.id} className="flex items-center gap-2.5 px-4 py-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d.status === 'picking' ? 'bg-orange-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
                          <span className="text-white text-xs font-semibold flex-1 truncate">{d.challenger_pseudo}</span>
                          <span className="text-white/20 text-[10px] flex-shrink-0">⚔</span>
                          <span className="text-white/55 text-xs flex-1 truncate">{d.opponent_pseudo}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${d.status === 'picking' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {d.status === 'picking' ? 'SELECT' : 'WAIT'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/20 text-sm text-center py-4 px-4">Aucun duel actif</p>
                  )}
                </div>
              </div>

              {/* Right col: activity feed */}
              <div className="lg:col-span-3 rounded-xl border border-white/6 overflow-hidden" style={cardStyle}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-white text-sm font-bold">Activité temps réel</span>
                  </div>
                  <span className="text-white/20 text-[10px]">{liveFeed.length} événements</span>
                </div>
                <div className="px-4 py-1 overflow-y-auto" style={{ maxHeight: '460px' }}>
                  {liveFeed.length === 0
                    ? <p className="text-white/20 text-sm text-center py-8">Aucune activité récente</p>
                    : liveFeed.map((ev) => <FeedRow key={`${ev.type}-${ev.id}`} ev={ev} />)}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════ GLOBAL ════════════════════════════ */}
        {tab === 'global' && (
          <motion.div key="global" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { title: 'Inscriptions', sub: '7 derniers jours', chart: <DayBarChart data={signupChart} color="#38BDF8" /> },
                { title: 'Duels', sub: '24h · heure par heure', chart: <BarChart data={duelChart} activeColor="#F97316" /> },
                { title: 'Packs ouverts', sub: '24h · heure par heure', chart: <BarChart data={packChart} activeColor="#EC4899" /> },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border border-white/6 p-4" style={cardStyle}>
                  <p className="text-white font-bold text-sm">{c.title}</p>
                  <p className="text-white/25 text-xs mb-4">{c.sub}</p>
                  {c.chart}
                </div>
              ))}
            </div>

            {/* Users */}
            <div>
              <SH icon={Users} title="Utilisateurs" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Total inscrits" value={stats.totalUsers} icon={Users} accent="text-sky-400" iconBg="bg-sky-500/10" />
                <StatCard label="Nouveaux aujourd'hui" value={stats.newUsersToday} sub={`+${stats.newUsersWeek} cette semaine`} icon={UserPlus} accent="text-cyan-400" iconBg="bg-cyan-500/10" trend={signupTrend} />
                <StatCard label="Membres VIP" value={stats.vipCount} sub={`${stats.totalUsers > 0 ? Math.round((stats.vipCount / stats.totalUsers) * 100) : 0}% de la base`} icon={Crown} accent="text-yellow-400" iconBg="bg-yellow-500/10" />
                <StatCard label="Push activé" value={stats.pushSubscribers} sub="abonnés notifs" icon={Bell} accent="text-indigo-400" iconBg="bg-indigo-500/10" />
              </div>
            </div>

            {/* Engagement */}
            <div>
              <SH icon={Activity} title="Engagement aujourd'hui" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Duels joués" value={stats.duelsToday} sub={`${botRatio}% vs bot`} icon={Swords} accent="text-orange-400" iconBg="bg-orange-500/10" trend={duelTrend} />
                <StatCard label="Pronostics" value={stats.predictionsToday} sub={`${predAccuracy}% de réussite`} icon={Target} accent="text-emerald-400" iconBg="bg-emerald-500/10" trend={predTrend} />
                <StatCard label="Cartes distribuées" value={stats.cardsFromPacksToday} sub="via packs" icon={Package} accent="text-pink-400" iconBg="bg-pink-500/10" />
                <StatCard label="Achats" value={stats.purchasesToday} sub={`${stats.revenueToday.toFixed(2)}€ aujourd'hui`} icon={ShoppingBag} accent="text-violet-400" iconBg="bg-violet-500/10" />
              </div>
            </div>

            {/* Missions */}
            <div className="rounded-xl border border-white/6 p-5" style={cardStyle}>
              <SH icon={CheckCircle} title="Missions du jour" />
              <div className="space-y-3">
                <ProgressBar label="Pronostic fait" value={stats.missionsPredictionDone} max={stats.totalUsers} color="#34D399" count={stats.missionsPredictionDone} />
                <ProgressBar label="Pack ouvert" value={stats.missionsPackDone} max={stats.totalUsers} color="#EC4899" count={stats.missionsPackDone} />
                <ProgressBar label="Battle gagnée" value={stats.missionsBattleWon} max={stats.totalUsers} color="#F97316" count={stats.missionsBattleWon} />
                <ProgressBar label="Bonus complet" value={stats.missionsBonusClaimed} max={stats.totalUsers} color="#F5C518" count={stats.missionsBonusClaimed} />
              </div>
            </div>

            {/* Flash + total cards */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Flash claims aujourd'hui" value={stats.flashClaimsToday} icon={Zap} accent="text-amber-400" iconBg="bg-amber-500/10" />
              <StatCard label="Cartes totales distribuées" value={stats.totalUserCards} icon={Package} accent="text-teal-400" iconBg="bg-teal-500/10" />
            </div>

            {/* Recent signups */}
            <div className="rounded-xl border border-white/6 overflow-hidden" style={cardStyle}>
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-white font-bold text-sm">Dernières inscriptions</span>
                </div>
                <Link href="/admin/users" className="text-sky-400 text-xs hover:underline">Voir tout →</Link>
              </div>
              <div className="divide-y divide-white/4">
                {recentSignups.slice(0, 8).map((u) => (
                  <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/2 transition-colors">
                    <Avatar user={u} />
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm font-semibold">{u.pseudo}</span>
                      {u.is_vip && <span className="ml-1.5 text-[9px] px-1 rounded bg-yellow-500/20 text-yellow-400 font-black">VIP</span>}
                      <span className="text-white/25 text-xs ml-2">{flag(u.nation)}</span>
                    </div>
                    <span className="text-yellow-400 text-xs font-bold tabular-nums">{u.coins.toLocaleString()}🪙</span>
                    <span className="text-white/25 text-xs tabular-nums ml-2">{timeAgo(u.created_at)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════ DUELS ═════════════════════════════ */}
        {tab === 'duels' && (
          <motion.div key="duels" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Total duels" value={stats.totalDuels} icon={Swords} accent="text-orange-400" iconBg="bg-orange-500/10" />
              <StatCard label="Aujourd'hui" value={stats.duelsToday} icon={TrendingUp} accent="text-amber-400" iconBg="bg-amber-500/10" trend={duelTrend} />
              <StatCard label="En cours" value={stats.activeDuels} icon={Zap} accent="text-green-400" iconBg="bg-green-500/10" pulse />
              <StatCard label="vs Bot" value={`${botRatio}%`} sub={`${stats.botDuelsToday} / ${stats.duelsToday} auj.`} icon={Bot} accent="text-gray-400" iconBg="bg-white/5" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/6 p-4" style={cardStyle}>
                <p className="text-white font-bold text-sm">Duels par heure</p>
                <p className="text-white/25 text-xs mb-4">Dernières 24h</p>
                <BarChart data={duelChart} activeColor="#F97316" />
              </div>
              <div className="rounded-xl border border-white/6 p-5" style={cardStyle}>
                <p className="text-white font-bold text-sm mb-4">Bot vs Humain (aujourd'hui)</p>
                <div className="space-y-3">
                  <ProgressBar label="vs Humain" value={stats.duelsToday - stats.botDuelsToday} max={stats.duelsToday} color="#F5C518" count={stats.duelsToday - stats.botDuelsToday} />
                  <ProgressBar label="vs Bot" value={stats.botDuelsToday} max={stats.duelsToday} color="#6B7280" count={stats.botDuelsToday} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/6 overflow-hidden" style={cardStyle}>
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Swords className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-white font-bold text-sm">Derniers duels terminés</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-white/25 font-semibold">
                      <th className="px-4 py-2.5 text-left">Challenger</th>
                      <th className="px-3 py-2.5 text-left">Adversaire</th>
                      <th className="px-3 py-2.5 text-center">Score</th>
                      <th className="px-3 py-2.5 text-center">Type</th>
                      <th className="px-3 py-2.5 text-right">Il y a</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/4 text-sm">
                    {recentDuels.map((d) => {
                      const challWon = d.winner_id === d.challenger_id
                      const oppWon = d.winner_id && d.winner_id !== d.challenger_id
                      return (
                        <tr key={d.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-4 py-2.5 font-semibold">
                            <span className={challWon ? 'text-green-400' : 'text-white/70'}>{d.challenger_pseudo}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={oppWon ? 'text-green-400' : 'text-white/40'}>{d.opponent_pseudo}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-black tabular-nums">
                            <span className={challWon ? 'text-green-400' : 'text-white/55'}>{d.challenger_score ?? 0}</span>
                            <span className="text-white/15 mx-1">—</span>
                            <span className={oppWon ? 'text-green-400' : 'text-white/55'}>{d.opponent_score ?? 0}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {d.is_bot
                              ? <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-white/5 text-white/25">BOT</span>
                              : <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-yellow-500/15 text-yellow-400">PVP</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-white/25 text-xs tabular-nums">{timeAgo(d.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════ PACKS ═════════════════════════════ */}
        {tab === 'packs' && (
          <motion.div key="packs" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Cartes totales" value={stats.totalUserCards} icon={Package} accent="text-teal-400" iconBg="bg-teal-500/10" />
              <StatCard label="Via packs auj." value={stats.cardsFromPacksToday} icon={Package} accent="text-pink-400" iconBg="bg-pink-500/10" />
              <StatCard label="Via battles auj." value={stats.cardsFromBattleToday} icon={Swords} accent="text-orange-400" iconBg="bg-orange-500/10" />
              <StatCard label="Autres sources" value={Math.max(0, Object.values(stats.cardsBySource).reduce((a, b) => a + b, 0) - stats.cardsFromPacksToday - stats.cardsFromBattleToday)} icon={Star} accent="text-indigo-400" iconBg="bg-indigo-500/10" />
            </div>

            <div className="rounded-xl border border-white/6 p-4" style={cardStyle}>
              <p className="text-white font-bold text-sm">Packs ouverts par heure</p>
              <p className="text-white/25 text-xs mb-4">Dernières 24h</p>
              <BarChart data={packChart} activeColor="#EC4899" />
            </div>

            <div className="rounded-xl border border-white/6 p-5" style={cardStyle}>
              <SH icon={Package} title="Sources des cartes (aujourd'hui)" />
              <div className="space-y-3">
                {Object.entries(stats.cardsBySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => {
                  const total = Object.values(stats.cardsBySource).reduce((a, b) => a + b, 0)
                  const colors: Record<string, string> = { pack: '#EC4899', battle: '#F97316', signup: '#38BDF8', event: '#A855F7', purchase: '#34D399' }
                  return <ProgressBar key={source} label={source} value={count} max={total} color={colors[source] ?? '#9CA3AF'} count={count} />
                })}
                {Object.keys(stats.cardsBySource).length === 0 && <p className="text-white/20 text-sm">Aucune carte distribuée aujourd'hui</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════ PRONOS ════════════════════════════ */}
        {tab === 'pronos' && (
          <motion.div key="pronos" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Total pronostics" value={stats.totalPredictions} icon={Target} accent="text-green-400" iconBg="bg-green-500/10" />
              <StatCard label="Aujourd'hui" value={stats.predictionsToday} icon={Target} accent="text-emerald-400" iconBg="bg-emerald-500/10" trend={predTrend} />
              <StatCard label="Taux de réussite" value={`${predAccuracy}%`} sub="score exact + vainqueur" icon={TrendingUp} accent="text-blue-400" iconBg="bg-blue-500/10" />
              <StatCard label="En attente" value={stats.pendingPredictions} sub="à résoudre" icon={Clock} accent="text-amber-400" iconBg="bg-amber-500/10" />
            </div>

            <div className="rounded-xl border border-white/6 p-5" style={cardStyle}>
              <p className="text-white font-bold text-sm mb-4">Résultats pronostics (aujourd'hui)</p>
              <div className="space-y-3">
                <ProgressBar label="✓ Score exact" value={stats.correctScoreToday} max={predResolved} color="#34D399" count={stats.correctScoreToday} />
                <ProgressBar label="✓ Bon vainqueur" value={stats.correctWinnerToday} max={predResolved} color="#38BDF8" count={stats.correctWinnerToday} />
                <ProgressBar label="✗ Raté" value={stats.wrongToday} max={predResolved} color="#F87171" count={stats.wrongToday} />
              </div>
            </div>

            <div className="rounded-xl border border-white/6 overflow-hidden" style={cardStyle}>
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-green-400" />
                <span className="text-white font-bold text-sm">Derniers pronostics</span>
              </div>
              <div className="divide-y divide-white/4">
                {recentPredictions.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                      p.status === 'correct_score' || p.status === 'correct_winner' ? 'bg-green-500/15' :
                      p.status === 'wrong' ? 'bg-red-500/15' : 'bg-white/5'
                    }`}>
                      {(p.status === 'correct_score' || p.status === 'correct_winner')
                        ? <CheckCircle className="w-3 h-3 text-green-400" />
                        : p.status === 'wrong'
                        ? <XCircle className="w-3 h-3 text-red-400" />
                        : <Clock className="w-3 h-3 text-white/25" />}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      {p.status === 'correct_score' && <span className="text-green-400 font-semibold">Score exact +{p.coins_won}🪙</span>}
                      {p.status === 'correct_winner' && <span className="text-blue-400 font-semibold">Bon vainqueur +{p.coins_won}🪙</span>}
                      {p.status === 'wrong' && <span className="text-red-400/70">Raté</span>}
                      {p.status === 'pending' && <span className="text-white/25">En attente</span>}
                    </div>
                    <span className="text-white/20 text-xs tabular-nums">{timeAgo(p.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════ ÉCONOMIE ══════════════════════════ */}
        {tab === 'economie' && (
          <motion.div key="economie" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Coins gagnés auj." value={stats.coinsIn.toLocaleString()} icon={TrendingUp} accent="text-green-400" iconBg="bg-green-500/10" />
              <StatCard label="Coins dépensés auj." value={stats.coinsOut.toLocaleString()} icon={TrendingDown} accent="text-red-400" iconBg="bg-red-500/10" />
              <StatCard label="Achats aujourd'hui" value={stats.purchasesToday} sub={`${stats.revenueToday.toFixed(2)}€`} icon={ShoppingBag} accent="text-violet-400" iconBg="bg-violet-500/10" />
              <StatCard label="Total achats" value={stats.purchasesTotal} icon={TrendingUp} accent="text-indigo-400" iconBg="bg-indigo-500/10" />
            </div>

            {/* OM/MTN payment stats */}
            <div className="rounded-xl border border-orange-500/20 overflow-hidden" style={cardStyle}>
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-white font-bold text-sm">Paiements Orange Money / MTN</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
                {[
                  { label: 'En attente', value: stats.payReqPending, color: 'text-amber-400' },
                  { label: 'Approuvés auj.', value: stats.payReqApprovedToday, color: 'text-green-400' },
                  { label: 'Total approuvés', value: stats.payReqApprovedTotal, color: 'text-blue-400' },
                  { label: 'Revenu total', value: stats.revenueFcfaTotal.toLocaleString('fr-FR') + ' FCFA', color: 'text-[#F5C518]', isStr: true },
                ].map((s) => (
                  <div key={s.label} className="px-4 py-3" style={{ background: 'rgba(10,10,15,0.8)' }}>
                    <p className="text-white/30 text-xs mb-1">{s.label}</p>
                    <p className={`font-black text-lg ${s.color}`} style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                      {s.isStr ? s.value : s.value}
                    </p>
                    {s.label === 'Approuvés auj.' && (
                      <p className="text-white/20 text-xs">{stats.revenueFcfaToday.toLocaleString('fr-FR')} FCFA</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="divide-y divide-white/4 max-h-64 overflow-y-auto">
                {recentPaymentRequests.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0
                      ${p.status === 'approved' ? 'bg-green-500/15' : p.status === 'rejected' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                      {p.status === 'approved'
                        ? <CheckCircle className="w-3 h-3 text-green-400" />
                        : p.status === 'rejected'
                          ? <XCircle className="w-3 h-3 text-red-400" />
                          : <Clock className="w-3 h-3 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-semibold capitalize">{p.pack_name}</span>
                      <span className="text-white/30 text-xs ml-2">
                        {p.payment_method === 'orange_money' ? '🟠 Orange' : '🟡 MTN'}
                      </span>
                    </div>
                    <span className={`font-bold text-xs tabular-nums ${p.status === 'approved' ? 'text-green-400' : p.status === 'rejected' ? 'text-red-400/60' : 'text-amber-400'}`}>
                      {p.amount_fcfa.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-white/20 text-xs tabular-nums ml-2">{timeAgo(p.created_at)}</span>
                  </div>
                ))}
                {recentPaymentRequests.length === 0 && (
                  <p className="text-white/20 text-sm text-center py-6">Aucun paiement</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/6 p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-white font-bold text-sm">Flux de coins par source</span>
                <span className="text-white/20 text-xs ml-1">— aujourd'hui</span>
              </div>
              <div className="space-y-3">
                {Object.entries(stats.reasonBreakdown)
                  .sort((a, b) => (b[1].in + b[1].out) - (a[1].in + a[1].out))
                  .map(([reason, data]) => {
                    const total = Object.values(stats.reasonBreakdown).reduce((s, r) => s + r.in + r.out, 0)
                    return (
                      <div key={reason}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white/50 text-xs">{reason}</span>
                          <div className="flex items-center gap-2.5 text-xs tabular-nums">
                            {data.in > 0 && <span className="text-green-400 font-bold">+{data.in.toLocaleString()}</span>}
                            {data.out > 0 && <span className="text-red-400 font-bold">-{data.out.toLocaleString()}</span>}
                            <span className="text-white/20">×{data.count}</span>
                          </div>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${total > 0 ? ((data.in + data.out) / total) * 100 : 0}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{ background: '#F5C518' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                {Object.keys(stats.reasonBreakdown).length === 0 && <p className="text-white/20 text-sm">Aucune transaction aujourd'hui</p>}
              </div>
            </div>

            <div className="rounded-xl border border-white/6 overflow-hidden" style={cardStyle}>
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-white font-bold text-sm">Derniers achats</span>
              </div>
              <div className="divide-y divide-white/4">
                {recentPurchases.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${p.status === 'completed' ? 'bg-green-500/15' : 'bg-white/5'}`}>
                      {p.status === 'completed' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Clock className="w-3 h-3 text-white/25" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-semibold capitalize">{p.pack_type}</span>
                      <span className="text-white/30 text-xs ml-2">+{p.coins_granted}🪙</span>
                    </div>
                    <span className="text-green-400 font-bold text-xs tabular-nums">{(p.amount_paid / 100).toFixed(2)}€</span>
                    <span className="text-white/20 text-xs tabular-nums ml-2">{timeAgo(p.created_at)}</span>
                  </div>
                ))}
                {recentPurchases.length === 0 && <p className="text-white/20 text-sm text-center py-6">Aucun achat récent</p>}
              </div>
            </div>

            <div className="rounded-xl border border-white/6 overflow-hidden" style={cardStyle}>
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-white font-bold text-sm">Dernières transactions</span>
              </div>
              <div className="px-4 py-1 overflow-y-auto" style={{ maxHeight: '320px' }}>
                {recentTransactions.filter((t) => !t.reason?.startsWith('Remboursement')).map((t) => (
                  <FeedRow key={`tx-${t.id}`} ev={{ type: 'transaction', id: t.id, amount: t.amount, reason: t.reason, created_at: t.created_at }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════ JOUEURS ═══════════════════════════ */}
        {tab === 'joueurs' && (
          <motion.div key="joueurs" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Rechercher un joueur…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-40 rounded-lg border border-white/8 px-4 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-500/40 transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              />
              <div className="flex gap-1">
                {([
                  { key: 'battles',     label: '⚔️ Battles' },
                  { key: 'coins',       label: '🪙 Coins' },
                  { key: 'predictions', label: '⚽ Pronos' },
                  { key: 'recent',      label: '🕐 Récent' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setUserSort(key)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                      userSort === key
                        ? 'bg-[#F5C518]/10 text-[#F5C518] border-[#F5C518]/25'
                        : 'border-white/6 text-white/30 hover:text-white/55'
                    }`}
                    style={{ background: userSort === key ? undefined : 'rgba(255,255,255,0.02)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-white/20 text-xs">{sortedUsers.length} joueur{sortedUsers.length !== 1 ? 's' : ''}</p>

            <div className="rounded-xl border border-white/6 overflow-hidden" style={cardStyle}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/6 text-[10px] uppercase tracking-wider text-white/25 font-semibold">
                      <th className="px-4 py-3 text-left">Joueur</th>
                      <th className="px-3 py-3 text-center">Duels</th>
                      <th className="px-3 py-3 text-center">Win%</th>
                      <th className="px-3 py-3 text-center">Série</th>
                      <th className="px-3 py-3 text-center">Pronos ✓</th>
                      <th className="px-3 py-3 text-center">Login</th>
                      <th className="px-3 py-3 text-right">Coins</th>
                      <th className="px-3 py-3 text-right">Actif</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/4">
                    {sortedUsers.map((u, i) => {
                      const isOnline = u.last_seen_at && (Date.now() - new Date(u.last_seen_at).getTime()) < 15 * 60 * 1000
                      const rateColor = u.win_rate >= 70 ? 'text-green-400' : u.win_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                      return (
                        <tr key={u.id} className="hover:bg-white/2 transition-colors text-sm">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-white/15 text-xs w-4 text-right tabular-nums">{i + 1}</span>
                              <div className="relative flex-shrink-0">
                                <Avatar user={u} size={6} />
                                {isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border-[1.5px] border-[#0A0A0F]" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="text-white font-semibold">{u.pseudo}</span>
                                  {u.is_vip && <Crown className="w-2.5 h-2.5 text-yellow-400" />}
                                </div>
                                <span className="text-white/20 text-[10px]">{flag(u.nation)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="text-white font-bold tabular-nums">{u.battles_played}</span>
                            <span className="text-white/20 text-xs ml-1 tabular-nums">({u.battles_won}V)</span>
                          </td>
                          <td className={`px-3 py-2.5 text-center font-black tabular-nums ${rateColor}`}>
                            {u.battles_played > 0 ? `${u.win_rate}%` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {u.battle_streak >= 3
                              ? <span className="text-orange-400 font-bold tabular-nums"><Flame className="w-3 h-3 inline" />{u.battle_streak}</span>
                              : <span className="text-white/20 tabular-nums">{u.battle_streak}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center text-green-400 font-bold tabular-nums">{u.predictions_correct}</td>
                          <td className="px-3 py-2.5 text-center text-white/30 text-xs tabular-nums">{u.daily_streak ?? 0}j</td>
                          <td className="px-3 py-2.5 text-right text-yellow-400 font-bold tabular-nums">{u.coins.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                            {u.last_seen_at
                              ? <span className={isOnline ? 'text-green-400 font-medium' : 'text-white/20'}>{timeAgo(u.last_seen_at)}</span>
                              : <span className="text-white/10">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Link href={`/admin/users/${u.id}`} className="text-white/15 hover:text-yellow-400/60 transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {sortedUsers.length === 0 && <p className="text-white/20 text-sm text-center py-8">Aucun résultat</p>}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
