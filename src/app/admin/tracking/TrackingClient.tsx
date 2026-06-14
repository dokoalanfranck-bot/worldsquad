'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Swords, Target, Package, TrendingUp,
  RefreshCw, Crown, Bot, Zap, Activity,
  UserPlus, ShoppingBag, Clock, Bell,
  CheckCircle, XCircle, Star, Coins, Radio,
  ChevronRight, ArrowUpRight, ArrowDownRight, Flame,
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
  coinsIn: number; coinsOut: number
  missionsPredictionDone: number; missionsPackDone: number; missionsBattleWon: number; missionsBonusClaimed: number
  flashClaimsToday: number
  cardsBySource: Record<string, number>
  reasonBreakdown: Record<string, { in: number; out: number; count: number }>
}
interface OnlineUser { id: string; pseudo: string; nation: string; photo_url: string | null; is_vip: boolean; last_seen_at: string; battles_played: number }
interface ActiveDuel { id: string; challenger_pseudo: string; opponent_pseudo: string; is_bot: boolean; status: string; coins_stake: number; created_at: string }
interface SignupRow { id: string; pseudo: string; nation: string; photo_url: string | null; is_vip: boolean; coins: number; created_at: string }
interface DuelRow { id: string; created_at: string; is_bot: boolean; challenger_pseudo: string; opponent_pseudo: string; challenger_score: number | null; opponent_score: number | null; winner_id: string | null; coins_stake: number; challenger_id: string }
interface PredictionRow { id: string; user_id: string; created_at: string; status: string; coins_won: number }
interface PurchaseRow { id: string; user_id: string; pack_type: string; coins_granted: number; amount_paid: number; status: string; created_at: string }
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

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Morocco: '🇲🇦',
  USA: '🇺🇸', Mexico: '🇲🇽', Japan: '🇯🇵', Senegal: '🇸🇳',
  Netherlands: '🇳🇱', Belgium: '🇧🇪', Croatia: '🇭🇷', Colombia: '🇨🇴',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

// ── KPI Card ───────────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, icon: Icon, color, pulse }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; pulse?: boolean
}) {
  return (
    <div className="glass rounded-xl p-4 relative overflow-hidden">
      {pulse && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-black text-white leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-white/50 text-xs mt-1">{label}</p>
      {sub && <p className="text-white/25 text-[11px] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Bar chart (24h) ────────────────────────────────────────────────────────────
function HourChart({ data, color = 'bg-white/20', activeColor = 'bg-yellow-400', label }: {
  data: ChartPoint[]; color?: string; activeColor?: string; label?: string
}) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const now = new Date().getHours()
  return (
    <div>
      {label && <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">{label}</p>}
      <div className="flex items-end gap-0.5 h-10">
        {data.map((d) => (
          <div key={d.hour} className="flex-1 flex flex-col items-center">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.4, delay: d.hour * 0.015 }}
              className={`w-full rounded-sm min-h-[2px] ${d.hour === now ? activeColor : color}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h} className="text-white/20 text-[9px]">{h}h</span>
        ))}
      </div>
    </div>
  )
}

// ── Day chart (7d) ─────────────────────────────────────────────────────────────
function DayChart({ data, color = 'bg-blue-400', label }: { data: DayPoint[]; color?: string; label?: string }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div>
      {label && <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">{label}</p>}
      <div className="flex items-end gap-1 h-10">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.4 }}
              className={`w-full rounded-sm min-h-[2px] ${color}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {data.map((d) => (
          <span key={d.date} className="text-white/20 text-[9px]">{fmtDate(d.date)}</span>
        ))}
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = 'bg-blue-400', label, count }: {
  value: number; max: number; color?: string; label: string; count: number
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-white/60 text-xs">{label}</span>
        <span className="text-white text-xs font-bold tabular-nums">{count} <span className="text-white/30">({pct}%)</span></span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">{children}</p>
}

// ── Activity event type ───────────────────────────────────────────────────────
type FeedEvent =
  | { type: 'signup'; id: string; pseudo: string; nation: string; is_vip: boolean; created_at: string }
  | { type: 'duel'; id: string; challenger: string; opponent: string; score: string; is_bot: boolean; created_at: string }
  | { type: 'prediction'; id: string; status: string; coins_won: number; created_at: string }
  | { type: 'purchase'; id: string; pack_type: string; coins_granted: number; created_at: string }
  | { type: 'transaction'; id: string; amount: number; reason: string; created_at: string }

function FeedRow({ ev }: { ev: FeedEvent }) {
  const ago = timeAgo(ev.created_at)

  if (ev.type === 'signup') return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5">
      <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0"><UserPlus className="w-3 h-3 text-blue-400" /></div>
      <div className="flex-1 min-w-0 text-sm">
        <span className="text-white font-semibold">{ev.pseudo}</span>
        <span className="text-white/40 text-xs ml-1.5">{flag(ev.nation)} inscription</span>
        {ev.is_vip && <span className="ml-1.5 text-[10px] px-1 rounded bg-yellow-500/20 text-yellow-400 font-black">VIP</span>}
      </div>
      <span className="text-white/25 text-xs">{ago}</span>
    </div>
  )

  if (ev.type === 'duel') return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5">
      <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
        {ev.is_bot ? <Bot className="w-3 h-3 text-gray-400" /> : <Swords className="w-3 h-3 text-orange-400" />}
      </div>
      <div className="flex-1 min-w-0 text-sm">
        <span className="text-white font-semibold">{ev.challenger}</span>
        <span className="text-white/30 text-xs mx-1.5">vs</span>
        <span className="text-white/60">{ev.opponent}</span>
        <span className="text-white/30 text-xs ml-1.5 tabular-nums">{ev.score}</span>
      </div>
      <span className="text-white/25 text-xs">{ago}</span>
    </div>
  )

  if (ev.type === 'prediction') return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5">
      <div className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0"><Target className="w-3 h-3 text-green-400" /></div>
      <div className="flex-1 min-w-0 text-sm">
        <span className="text-white/60">Pronostic</span>
        {ev.status === 'correct_score' && <span className="ml-1.5 text-xs text-green-400 font-bold">✓ score exact +{ev.coins_won}🪙</span>}
        {ev.status === 'correct_winner' && <span className="ml-1.5 text-xs text-blue-400 font-bold">✓ vainqueur +{ev.coins_won}🪙</span>}
        {ev.status === 'wrong' && <span className="ml-1.5 text-xs text-red-400">✗ raté</span>}
        {ev.status === 'pending' && <span className="ml-1.5 text-xs text-white/30">en attente</span>}
      </div>
      <span className="text-white/25 text-xs">{ago}</span>
    </div>
  )

  if (ev.type === 'purchase') return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5">
      <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-3 h-3 text-purple-400" /></div>
      <div className="flex-1 min-w-0 text-sm">
        <span className="text-white font-semibold">{ev.pack_type}</span>
        <span className="text-white/40 text-xs ml-1.5">acheté · +{ev.coins_granted}🪙</span>
      </div>
      <span className="text-white/25 text-xs">{ago}</span>
    </div>
  )

  if (ev.type === 'transaction') {
    const isCredit = ev.amount > 0
    let icon = <Coins className="w-3 h-3 text-yellow-400" />
    let bg = 'bg-yellow-500/10'
    if (ev.reason?.startsWith('Ouverture')) { icon = <Package className="w-3 h-3 text-pink-400" />; bg = 'bg-pink-500/10' }
    else if (ev.reason?.startsWith('⚡')) { icon = <Zap className="w-3 h-3 text-yellow-400" />; bg = 'bg-yellow-500/10' }
    else if (ev.reason?.startsWith('Mission')) { icon = <CheckCircle className="w-3 h-3 text-green-400" />; bg = 'bg-green-500/10' }
    else if (ev.reason?.startsWith('Récompense')) { icon = <Star className="w-3 h-3 text-amber-400" />; bg = 'bg-amber-500/10' }
    return (
      <div className="flex items-center gap-3 py-2 border-b border-white/5">
        <div className={`w-6 h-6 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <div className="flex-1 min-w-0 text-sm">
          <span className="text-white/60 text-xs">{ev.reason}</span>
        </div>
        <span className={`text-xs font-bold tabular-nums ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
          {isCredit ? '+' : ''}{ev.amount}🪙
        </span>
        <span className="text-white/25 text-xs ml-2">{ago}</span>
      </div>
    )
  }
  return null
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 7 }: { user: { pseudo: string; photo_url: string | null }; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full bg-white/10 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0`}>
      {user.photo_url ? <img src={user.photo_url} alt={user.pseudo} className="w-full h-full object-cover" /> : user.pseudo[0]?.toUpperCase()}
    </div>
  )
}

// ── TABS ──────────────────────────────────────────────────────────────────────
type Tab = 'live' | 'global' | 'duels' | 'packs' | 'pronos' | 'economie' | 'joueurs'
const TABS: { key: Tab; label: string }[] = [
  { key: 'live', label: '🔴 Live' },
  { key: 'global', label: '📊 Global' },
  { key: 'duels', label: '⚔️ Duels' },
  { key: 'packs', label: '📦 Packs' },
  { key: 'pronos', label: '⚽ Pronos' },
  { key: 'economie', label: '💰 Économie' },
  { key: 'joueurs', label: '👥 Joueurs' },
]

// ── MAIN ──────────────────────────────────────────────────────────────────────
export function TrackingClient(props: Props) {
  const { stats, recentSignups, recentDuels, recentPredictions, recentPurchases, recentTransactions, topUsers, onlineUsers, activeDuelsList, duelChart, packChart, signupChart, fetchedAt } = props
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
    const interval = tab === 'live' ? 10000 : 30000
    const t = setInterval(refresh, interval)
    return () => clearInterval(t)
  }, [refresh, tab])

  // Unified feed (live tab)
  const liveFeed: FeedEvent[] = [
    ...recentSignups.map((u): FeedEvent => ({ type: 'signup', id: u.id, pseudo: u.pseudo, nation: u.nation, is_vip: u.is_vip, created_at: u.created_at })),
    ...recentDuels.map((d): FeedEvent => ({ type: 'duel', id: d.id, challenger: d.challenger_pseudo, opponent: d.opponent_pseudo, score: `${d.challenger_score ?? 0}-${d.opponent_score ?? 0}`, is_bot: d.is_bot, created_at: d.created_at })),
    ...recentPredictions.map((p): FeedEvent => ({ type: 'prediction', id: p.id, status: p.status, coins_won: p.coins_won, created_at: p.created_at })),
    ...recentPurchases.map((p): FeedEvent => ({ type: 'purchase', id: p.id, pack_type: p.pack_type, coins_granted: p.coins_granted, created_at: p.created_at })),
    ...recentTransactions.filter((t) => !t.reason?.startsWith('Remboursement')).map((t): FeedEvent => ({ type: 'transaction', id: t.id, amount: t.amount, reason: t.reason, created_at: t.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 80)

  const botRatio = stats.duelsToday > 0 ? Math.round((stats.botDuelsToday / stats.duelsToday) * 100) : 0
  const predAccuracy = (stats.correctScoreToday + stats.correctWinnerToday + stats.wrongToday) > 0
    ? Math.round(((stats.correctScoreToday + stats.correctWinnerToday) / (stats.correctScoreToday + stats.correctWinnerToday + stats.wrongToday)) * 100)
    : 0

  const sortedUsers = [...topUsers]
    .filter((u) => u.pseudo.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (userSort === 'battles') return b.battles_played - a.battles_played
      if (userSort === 'coins') return b.coins - a.coins
      if (userSort === 'predictions') return b.predictions_correct - a.predictions_correct
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bebas text-4xl text-white tracking-wide leading-none">TRACKING PLATFORM</h1>
          <p className="text-white/30 text-xs mt-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Live · MAJ il y a {secondsAgo}s · refresh auto {tab === 'live' ? '10s' : '30s'}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-xs transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: 'En ligne', value: stats.onlineCount, color: 'text-green-400', pulse: true },
          { label: 'Inscrits auj.', value: stats.newUsersToday, color: 'text-blue-400' },
          { label: 'Duels actifs', value: stats.activeDuels, color: 'text-orange-400', pulse: true },
          { label: 'Duels auj.', value: stats.duelsToday, color: 'text-yellow-400' },
          { label: 'Pronos auj.', value: stats.predictionsToday, color: 'text-emerald-400' },
          { label: 'Packs auj.', value: stats.cardsFromPacksToday, color: 'text-pink-400' },
          { label: 'Achats auj.', value: stats.purchasesToday, color: 'text-purple-400' },
          { label: 'Flash claims', value: stats.flashClaimsToday, color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-lg px-3 py-2.5 relative">
            {s.pulse && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            <p className={`text-lg font-black leading-none ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-white/30 text-[10px] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0 border-b border-white/5 scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
              tab === t.key ? 'text-yellow-400 border-yellow-400' : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── LIVE ── */}
        {tab === 'live' && (
          <motion.div key="live" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* Online users */}
            <div className="glass rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-green-400 font-black text-sm uppercase tracking-wider">{stats.onlineCount} en ligne</p>
                  <span className="text-white/20 text-xs">· 5 dernières min</span>
                </div>
              </div>
              {onlineUsers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {onlineUsers.map((u) => (
                    <Link key={u.id} href={`/admin/users/${u.id}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                    >
                      <Avatar user={u} size={5} />
                      <span className="text-white text-xs font-semibold">{u.pseudo}</span>
                      <span className="text-white/30 text-[10px]">{flag(u.nation)}</span>
                      {u.is_vip && <Crown className="w-3 h-3 text-yellow-400" />}
                      <span className="text-green-500 text-[10px]">{timeAgo(u.last_seen_at)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-white/25 text-sm">Aucun joueur actif pour l'instant</p>
              )}
            </div>

            {/* Active duels */}
            {activeDuelsList.length > 0 && (
              <div className="glass rounded-xl overflow-hidden border border-orange-500/15">
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-orange-400 animate-pulse" />
                  <p className="text-white font-semibold text-sm">{stats.activeDuels} duel{stats.activeDuels > 1 ? 's' : ''} en cours</p>
                </div>
                <div className="divide-y divide-white/5">
                  {activeDuelsList.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === 'picking' ? 'bg-orange-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
                      <span className="text-white font-semibold">{d.challenger_pseudo}</span>
                      <span className="text-white/30 text-xs">⚔️</span>
                      <span className="text-white/70">{d.opponent_pseudo}</span>
                      {d.is_bot && <span className="text-[10px] px-1 py-0.5 rounded bg-gray-500/20 text-gray-400">BOT</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ml-auto ${d.status === 'picking' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {d.status === 'picking' ? 'Sélection' : 'Recherche'}
                      </span>
                      <span className="text-white/25 text-xs">{timeAgo(d.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live feed */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-white/50" />
                <p className="text-white font-semibold text-sm">Flux temps réel</p>
                <span className="ml-auto text-white/25 text-xs">{liveFeed.length} événements</span>
              </div>
              <div className="px-4 py-1 max-h-[520px] overflow-y-auto">
                {liveFeed.length === 0
                  ? <p className="text-white/25 text-sm text-center py-8">Aucune activité récente</p>
                  : liveFeed.map((ev) => <FeedRow key={`${ev.type}-${ev.id}`} ev={ev} />)
                }
              </div>
            </div>
          </motion.div>
        )}

        {/* ── GLOBAL ── */}
        {tab === 'global' && (
          <motion.div key="global" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="glass rounded-xl p-4">
                <p className="text-white font-semibold text-sm mb-3">Inscriptions — 7 jours</p>
                <DayChart data={signupChart} color="bg-blue-400" />
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-white font-semibold text-sm mb-3">Duels — 24h</p>
                <HourChart data={duelChart} color="bg-orange-400/40" activeColor="bg-orange-400" />
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-white font-semibold text-sm mb-3">Packs ouverts — 24h</p>
                <HourChart data={packChart} color="bg-pink-400/40" activeColor="bg-pink-400" />
              </div>
            </div>

            {/* Users KPIs */}
            <div>
              <SectionTitle>Utilisateurs</SectionTitle>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Total inscrits" value={stats.totalUsers} icon={Users} color="bg-blue-500/15 text-blue-400" />
                <Kpi label="Nouveaux auj." value={stats.newUsersToday} sub={`+${stats.newUsersWeek} cette semaine`} icon={UserPlus} color="bg-cyan-500/15 text-cyan-400" />
                <Kpi label="VIP" value={stats.vipCount} sub={`${stats.totalUsers > 0 ? Math.round((stats.vipCount / stats.totalUsers) * 100) : 0}% de la base`} icon={Crown} color="bg-yellow-500/15 text-yellow-400" />
                <Kpi label="Push activé" value={stats.pushSubscribers} sub="abonnés notifs" icon={Bell} color="bg-indigo-500/15 text-indigo-400" />
              </div>
            </div>

            {/* Engagement KPIs */}
            <div>
              <SectionTitle>Engagement aujourd'hui</SectionTitle>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Duels joués" value={stats.duelsToday} sub={`${botRatio}% vs bot`} icon={Swords} color="bg-orange-500/15 text-orange-400" />
                <Kpi label="Pronostics" value={stats.predictionsToday} sub={`${predAccuracy}% de réussite`} icon={Target} color="bg-emerald-500/15 text-emerald-400" />
                <Kpi label="Packs ouverts" value={stats.cardsFromPacksToday} sub="cartes distribuées" icon={Package} color="bg-pink-500/15 text-pink-400" />
                <Kpi label="Achats" value={stats.purchasesToday} sub={`${stats.revenueToday.toFixed(2)}€ auj.`} icon={ShoppingBag} color="bg-purple-500/15 text-purple-400" />
              </div>
            </div>

            {/* Missions du jour */}
            <div className="glass rounded-xl p-5">
              <p className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" /> Missions du jour
                <span className="text-white/30 text-xs ml-1">— {stats.newUsersToday > 0 ? Math.round((stats.missionsBonusClaimed / Math.max(stats.totalUsers, 1)) * 100) : 0}% bonus complet</span>
              </p>
              <div className="space-y-3">
                <ProgressBar label="Pronostic fait" value={stats.missionsPredictionDone} max={stats.totalUsers} color="bg-green-400" count={stats.missionsPredictionDone} />
                <ProgressBar label="Pack ouvert" value={stats.missionsPackDone} max={stats.totalUsers} color="bg-pink-400" count={stats.missionsPackDone} />
                <ProgressBar label="Battle gagnée" value={stats.missionsBattleWon} max={stats.totalUsers} color="bg-orange-400" count={stats.missionsBattleWon} />
                <ProgressBar label="Bonus complet" value={stats.missionsBonusClaimed} max={stats.totalUsers} color="bg-yellow-400" count={stats.missionsBonusClaimed} />
              </div>
            </div>

            {/* Flash + cards */}
            <div className="grid grid-cols-2 gap-4">
              <Kpi label="Flash claims auj." value={stats.flashClaimsToday} icon={Zap} color="bg-amber-500/15 text-amber-400" />
              <Kpi label="Cartes totales" value={stats.totalUserCards} icon={Package} color="bg-teal-500/15 text-teal-400" />
            </div>

            {/* Recent signups */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="text-white font-semibold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-400" /> Dernières inscriptions</p>
                <Link href="/admin/users" className="text-blue-400 text-xs hover:underline">Voir tout →</Link>
              </div>
              <div className="divide-y divide-white/5">
                {recentSignups.slice(0, 8).map((u) => (
                  <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors">
                    <Avatar user={u} />
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm font-medium">{u.pseudo}</span>
                      {u.is_vip && <span className="ml-1.5 text-[10px] px-1 rounded bg-yellow-500/20 text-yellow-400 font-black">VIP</span>}
                      <span className="text-white/30 text-xs ml-2">{flag(u.nation)}</span>
                    </div>
                    <span className="text-white/40 text-xs">{timeAgo(u.created_at)}</span>
                    <span className="text-yellow-400 text-xs font-bold">{u.coins.toLocaleString()}🪙</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── DUELS ── */}
        {tab === 'duels' && (
          <motion.div key="duels" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Total duels" value={stats.totalDuels} icon={Swords} color="bg-orange-500/15 text-orange-400" />
              <Kpi label="Aujourd'hui" value={stats.duelsToday} icon={TrendingUp} color="bg-amber-500/15 text-amber-400" />
              <Kpi label="Actifs maintenant" value={stats.activeDuels} pulse icon={Zap} color="bg-green-500/15 text-green-400" />
              <Kpi label="vs Bot auj." value={`${botRatio}%`} sub={`${stats.botDuelsToday}/${stats.duelsToday}`} icon={Bot} color="bg-gray-500/15 text-gray-400" />
            </div>

            {/* Chart + bot vs human */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-4">
                <p className="text-white font-semibold text-sm mb-3">Duels par heure — 24h</p>
                <HourChart data={duelChart} color="bg-orange-400/40" activeColor="bg-orange-400" />
              </div>
              <div className="glass rounded-xl p-5">
                <p className="text-white font-semibold text-sm mb-4">Bot vs Humain (aujourd'hui)</p>
                <div className="space-y-3">
                  <ProgressBar label="vs Humain" value={stats.duelsToday - stats.botDuelsToday} max={stats.duelsToday} color="bg-yellow-400" count={stats.duelsToday - stats.botDuelsToday} />
                  <ProgressBar label="vs Bot" value={stats.botDuelsToday} max={stats.duelsToday} color="bg-gray-400" count={stats.botDuelsToday} />
                </div>
              </div>
            </div>

            {/* Duels table */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-white font-semibold text-sm flex items-center gap-2"><Swords className="w-4 h-4 text-orange-400" /> Derniers duels terminés</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-wider">
                      <th className="px-4 py-2.5 text-left">Challenger</th>
                      <th className="px-3 py-2.5 text-left">Adversaire</th>
                      <th className="px-3 py-2.5 text-center">Score</th>
                      <th className="px-3 py-2.5 text-center">Type</th>
                      <th className="px-3 py-2.5 text-right">Il y a</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentDuels.map((d) => {
                      const challWon = d.winner_id === d.challenger_id
                      const oppWon = d.winner_id && d.winner_id !== d.challenger_id
                      const isDraw = !d.winner_id
                      return (
                        <tr key={d.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className={`font-semibold ${challWon ? 'text-green-400' : 'text-white'}`}>{d.challenger_pseudo}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`${oppWon ? 'text-green-400' : 'text-white/60'}`}>{d.opponent_pseudo}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-black tabular-nums">
                            <span className={challWon ? 'text-green-400' : 'text-white/80'}>{d.challenger_score ?? 0}</span>
                            <span className="text-white/20 mx-1">—</span>
                            <span className={oppWon ? 'text-green-400' : 'text-white/80'}>{d.opponent_score ?? 0}</span>
                            {isDraw && <span className="ml-2 text-[10px] text-white/30 px-1 rounded bg-white/5">Nul</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {d.is_bot
                              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">BOT</span>
                              : <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">PVP</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-white/30 text-xs">{timeAgo(d.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PACKS ── */}
        {tab === 'packs' && (
          <motion.div key="packs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Cartes totales" value={stats.totalUserCards} icon={Package} color="bg-teal-500/15 text-teal-400" />
              <Kpi label="Via packs auj." value={stats.cardsFromPacksToday} icon={Package} color="bg-pink-500/15 text-pink-400" />
              <Kpi label="Via battles auj." value={stats.cardsFromBattleToday} icon={Swords} color="bg-orange-500/15 text-orange-400" />
              <Kpi label="Autres sources auj." value={Object.values(stats.cardsBySource).reduce((a, b) => a + b, 0) - stats.cardsFromPacksToday - stats.cardsFromBattleToday} icon={Star} color="bg-indigo-500/15 text-indigo-400" />
            </div>

            {/* Pack chart */}
            <div className="glass rounded-xl p-4">
              <p className="text-white font-semibold text-sm mb-3">Packs ouverts par heure — 24h</p>
              <HourChart data={packChart} color="bg-pink-400/40" activeColor="bg-pink-400" />
            </div>

            {/* Source breakdown */}
            <div className="glass rounded-xl p-5">
              <p className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-pink-400" /> Sources des cartes (aujourd'hui)</p>
              <div className="space-y-3">
                {Object.entries(stats.cardsBySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => {
                  const total = Object.values(stats.cardsBySource).reduce((a, b) => a + b, 0)
                  const colors: Record<string, string> = { pack: 'bg-pink-400', battle: 'bg-orange-400', signup: 'bg-blue-400', event: 'bg-purple-400', purchase: 'bg-green-400' }
                  return (
                    <ProgressBar key={source} label={source} value={count} max={total} color={colors[source] ?? 'bg-white/40'} count={count} />
                  )
                })}
                {Object.keys(stats.cardsBySource).length === 0 && <p className="text-white/25 text-sm">Aucune carte distribuée aujourd'hui</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PRONOS ── */}
        {tab === 'pronos' && (
          <motion.div key="pronos" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Total pronostics" value={stats.totalPredictions} icon={Target} color="bg-green-500/15 text-green-400" />
              <Kpi label="Aujourd'hui" value={stats.predictionsToday} icon={Target} color="bg-emerald-500/15 text-emerald-400" />
              <Kpi label="Taux de réussite" value={`${predAccuracy}%`} sub="score exact + vainqueur" icon={TrendingUp} color="bg-blue-500/15 text-blue-400" />
              <Kpi label="En attente" value={stats.pendingPredictions} sub="à résoudre" icon={Clock} color="bg-amber-500/15 text-amber-400" />
            </div>

            {/* Status breakdown */}
            <div className="glass rounded-xl p-5">
              <p className="text-white font-semibold text-sm mb-4">Résultats pronostics (aujourd'hui)</p>
              <div className="space-y-3">
                {(() => {
                  const total = stats.correctScoreToday + stats.correctWinnerToday + stats.wrongToday
                  return (
                    <>
                      <ProgressBar label="✓ Score exact" value={stats.correctScoreToday} max={total} color="bg-green-400" count={stats.correctScoreToday} />
                      <ProgressBar label="✓ Bon vainqueur" value={stats.correctWinnerToday} max={total} color="bg-blue-400" count={stats.correctWinnerToday} />
                      <ProgressBar label="✗ Raté" value={stats.wrongToday} max={total} color="bg-red-400" count={stats.wrongToday} />
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Recent predictions */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-white font-semibold text-sm flex items-center gap-2"><Target className="w-4 h-4 text-green-400" /> Derniers pronostics</p>
              </div>
              <div className="divide-y divide-white/5">
                {recentPredictions.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      p.status === 'correct_score' ? 'bg-green-500/15' :
                      p.status === 'correct_winner' ? 'bg-blue-500/15' :
                      p.status === 'wrong' ? 'bg-red-500/15' : 'bg-white/5'
                    }`}>
                      {p.status === 'correct_score' || p.status === 'correct_winner'
                        ? <CheckCircle className="w-3 h-3 text-green-400" />
                        : p.status === 'wrong'
                        ? <XCircle className="w-3 h-3 text-red-400" />
                        : <Clock className="w-3 h-3 text-white/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {p.status === 'correct_score' && <span className="text-green-400 text-xs font-bold">Score exact +{p.coins_won}🪙</span>}
                      {p.status === 'correct_winner' && <span className="text-blue-400 text-xs font-bold">Bon vainqueur +{p.coins_won}🪙</span>}
                      {p.status === 'wrong' && <span className="text-red-400 text-xs">Raté</span>}
                      {p.status === 'pending' && <span className="text-white/30 text-xs">En attente</span>}
                    </div>
                    <span className="text-white/25 text-xs">{timeAgo(p.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ÉCONOMIE ── */}
        {tab === 'economie' && (
          <motion.div key="economie" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Coins gagnés auj." value={stats.coinsIn.toLocaleString()} icon={ArrowUpRight} color="bg-green-500/15 text-green-400" />
              <Kpi label="Coins dépensés auj." value={stats.coinsOut.toLocaleString()} icon={ArrowDownRight} color="bg-red-500/15 text-red-400" />
              <Kpi label="Achats auj." value={stats.purchasesToday} sub={`${stats.revenueToday.toFixed(2)}€`} icon={ShoppingBag} color="bg-purple-500/15 text-purple-400" />
              <Kpi label="Total achats" value={stats.purchasesTotal} icon={TrendingUp} color="bg-indigo-500/15 text-indigo-400" />
            </div>

            {/* Coin breakdown by reason */}
            <div className="glass rounded-xl p-5">
              <p className="text-white font-semibold text-sm mb-4 flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-400" /> Flux de coins par source (aujourd'hui)</p>
              <div className="space-y-3">
                {Object.entries(stats.reasonBreakdown)
                  .sort((a, b) => (b[1].in + b[1].out) - (a[1].in + a[1].out))
                  .map(([reason, data]) => {
                    const total = Object.values(stats.reasonBreakdown).reduce((s, r) => s + r.in + r.out, 0)
                    return (
                      <div key={reason} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-xs">{reason}</span>
                          <div className="flex gap-3 items-center text-xs">
                            {data.in > 0 && <span className="text-green-400 font-bold">+{data.in.toLocaleString()}</span>}
                            {data.out > 0 && <span className="text-red-400 font-bold">-{data.out.toLocaleString()}</span>}
                            <span className="text-white/25">×{data.count}</span>
                          </div>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${total > 0 ? ((data.in + data.out) / total) * 100 : 0}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full rounded-full bg-yellow-400/60"
                          />
                        </div>
                      </div>
                    )
                  })}
                {Object.keys(stats.reasonBreakdown).length === 0 && <p className="text-white/25 text-sm">Aucune transaction aujourd'hui</p>}
              </div>
            </div>

            {/* Recent purchases */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-white font-semibold text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-purple-400" /> Derniers achats</p>
              </div>
              <div className="divide-y divide-white/5">
                {recentPurchases.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${p.status === 'completed' ? 'bg-green-500/15' : 'bg-white/5'}`}>
                      {p.status === 'completed' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Clock className="w-3 h-3 text-white/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-semibold">{p.pack_type}</span>
                      <span className="text-white/40 text-xs ml-2">+{p.coins_granted}🪙</span>
                    </div>
                    <span className="text-green-400 font-bold text-xs">{(p.amount_paid / 100).toFixed(2)}€</span>
                    <span className="text-white/25 text-xs ml-2">{timeAgo(p.created_at)}</span>
                  </div>
                ))}
                {recentPurchases.length === 0 && <p className="text-white/25 text-sm text-center py-6">Aucun achat récent</p>}
              </div>
            </div>

            {/* Recent transactions feed */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-white font-semibold text-sm flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-400" /> Dernières transactions</p>
              </div>
              <div className="px-4 py-1 max-h-[320px] overflow-y-auto">
                {recentTransactions.filter((t) => !t.reason?.startsWith('Remboursement')).map((t) => (
                  <FeedRow key={`tx-${t.id}`} ev={{ type: 'transaction', id: t.id, amount: t.amount, reason: t.reason, created_at: t.created_at }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── JOUEURS ── */}
        {tab === 'joueurs' && (
          <motion.div key="joueurs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Search + sort */}
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Rechercher un joueur…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-40 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500/50"
              />
              <div className="flex gap-1">
                {([
                  { key: 'battles', label: '⚔️ Battles' },
                  { key: 'coins', label: '🪙 Coins' },
                  { key: 'predictions', label: '⚽ Pronos' },
                  { key: 'recent', label: '🕐 Récent' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setUserSort(key)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      userSort === key ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-white/25 text-xs">{sortedUsers.length} joueur{sortedUsers.length > 1 ? 's' : ''}</p>

            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Joueur</th>
                      <th className="px-3 py-3 text-center">Duels</th>
                      <th className="px-3 py-3 text-center">Win%</th>
                      <th className="px-3 py-3 text-center">Série</th>
                      <th className="px-3 py-3 text-center">Pronos ✓</th>
                      <th className="px-3 py-3 text-center">Login</th>
                      <th className="px-3 py-3 text-right">Coins</th>
                      <th className="px-3 py-3 text-right">Vu</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedUsers.map((u, i) => {
                      const isOnline = u.last_seen_at && (Date.now() - new Date(u.last_seen_at).getTime()) < 5 * 60 * 1000
                      const rateColor = u.win_rate >= 70 ? 'text-green-400' : u.win_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                      return (
                        <tr key={u.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-white/20 text-xs w-5 text-right">{i + 1}</span>
                              <div className="relative flex-shrink-0">
                                <Avatar user={u} />
                                {isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#0D0D17]" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white font-semibold">{u.pseudo}</span>
                                  {u.is_vip && <Crown className="w-3 h-3 text-yellow-400" />}
                                </div>
                                <span className="text-white/25 text-xs">{flag(u.nation)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-white font-bold">{u.battles_played}</span>
                            <span className="text-white/25 text-xs ml-1">({u.battles_won}V)</span>
                          </td>
                          <td className={`px-3 py-3 text-center font-black ${rateColor}`}>
                            {u.battles_played > 0 ? `${u.win_rate}%` : '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {u.battle_streak >= 3
                              ? <span className="text-orange-400 font-bold"><Flame className="w-3 h-3 inline" />{u.battle_streak}</span>
                              : <span className="text-white/25">{u.battle_streak}</span>}
                          </td>
                          <td className="px-3 py-3 text-center text-green-400 font-bold">{u.predictions_correct}</td>
                          <td className="px-3 py-3 text-center text-white/40 text-xs">{u.daily_streak ?? 0}j</td>
                          <td className="px-3 py-3 text-right text-yellow-400 font-bold">{u.coins.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-xs">
                            {u.last_seen_at
                              ? <span className={isOnline ? 'text-green-400 font-medium' : 'text-white/25'}>{timeAgo(u.last_seen_at)}</span>
                              : <span className="text-white/15">jamais</span>}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Link href={`/admin/users/${u.id}`} className="text-yellow-400/70 hover:text-yellow-400 transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {sortedUsers.length === 0 && <p className="text-white/25 text-sm text-center py-8">Aucun résultat</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
