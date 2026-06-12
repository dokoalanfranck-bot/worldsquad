'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Swords, Target, Package, Coins, TrendingUp,
  RefreshCw, Crown, Bot, Zap, BarChart2, Activity,
  UserPlus, Trophy, ShoppingBag, Clock,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number; newUsersToday: number; newUsersWeek: number; vipCount: number
  totalDuels: number; duelsToday: number; activeDuels: number; botDuelsToday: number
  totalPredictions: number; predictionsToday: number
  totalUserCards: number; purchasesToday: number
  coinsIn: number; coinsOut: number
}
interface SignupRow { id: string; pseudo: string; nation: string; photo_url: string | null; is_vip: boolean; coins: number; created_at: string }
interface DuelRow { id: string; created_at: string; is_bot: boolean; challenger_pseudo: string; opponent_pseudo: string; challenger_score: number | null; opponent_score: number | null; winner_id: string | null; coins_stake: number; challenger_id: string }
interface PredictionRow { id: string; user_id: string; created_at: string; status: string; coins_won: number }
interface PurchaseRow { id: string; user_id: string; pack_type: string; coins_granted: number; amount_paid: number; status: string; created_at: string }
interface UserRow { id: string; pseudo: string; nation: string; photo_url: string | null; is_vip: boolean; coins: number; battles_won: number; battles_played: number; predictions_correct: number; battle_streak: number; best_streak: number; created_at: string; win_rate: number; losses: number }
interface ChartPoint { hour: number; count: number }

interface Props {
  stats: Stats
  recentSignups: SignupRow[]
  recentDuels: DuelRow[]
  recentPredictions: PredictionRow[]
  recentPurchases: PurchaseRow[]
  topUsers: UserRow[]
  duelChart: ChartPoint[]
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

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Morocco: '🇲🇦',
  USA: '🇺🇸', Mexico: '🇲🇽', Japan: '🇯🇵', Senegal: '🇸🇳',
  Netherlands: '🇳🇱', Belgium: '🇧🇪', Croatia: '🇭🇷',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, pulse }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; pulse?: boolean
}) {
  return (
    <div className="glass rounded-xl p-4 relative overflow-hidden">
      {pulse && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-black text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-white/50 text-xs mt-0.5">{label}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ── Activity Feed item ─────────────────────────────────────────────────────────
type FeedEvent =
  | { type: 'signup'; id: string; pseudo: string; nation: string; is_vip: boolean; created_at: string }
  | { type: 'duel'; id: string; challenger: string; opponent: string; score: string; is_bot: boolean; created_at: string }
  | { type: 'prediction'; id: string; user_id: string; status: string; coins_won: number; created_at: string }
  | { type: 'purchase'; id: string; pack_type: string; coins_granted: number; created_at: string }

function FeedItem({ event }: { event: FeedEvent }) {
  const ago = timeAgo(event.created_at)
  if (event.type === 'signup') return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
      <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0"><UserPlus className="w-3.5 h-3.5 text-blue-400" /></div>
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm font-bold">{event.pseudo}</span>
        <span className="text-white/40 text-xs ml-1.5">{flag(event.nation)} vient de s'inscrire</span>
        {event.is_vip && <span className="ml-1.5 text-[10px] font-black px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400">VIP</span>}
      </div>
      <span className="text-white/30 text-xs flex-shrink-0">{ago}</span>
    </div>
  )
  if (event.type === 'duel') return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
      <div className="w-7 h-7 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
        {event.is_bot ? <Bot className="w-3.5 h-3.5 text-yellow-400" /> : <Swords className="w-3.5 h-3.5 text-yellow-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm font-bold">{event.challenger}</span>
        <span className="text-white/40 text-xs mx-1">vs</span>
        <span className="text-white/70 text-sm">{event.opponent}</span>
        <span className="text-white/40 text-xs ml-1.5">· {event.score}</span>
        {event.is_bot && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-gray-500/20 text-gray-400">BOT</span>}
      </div>
      <span className="text-white/30 text-xs flex-shrink-0">{ago}</span>
    </div>
  )
  if (event.type === 'prediction') return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
      <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0"><Target className="w-3.5 h-3.5 text-green-400" /></div>
      <div className="flex-1 min-w-0">
        <span className="text-white/60 text-sm">Pronostic</span>
        {event.status === 'correct_score' && <span className="ml-1.5 text-xs text-green-400 font-bold">✓ score exact +{event.coins_won}🪙</span>}
        {event.status === 'correct_winner' && <span className="ml-1.5 text-xs text-blue-400 font-bold">✓ vainqueur +{event.coins_won}🪙</span>}
        {event.status === 'wrong' && <span className="ml-1.5 text-xs text-red-400">✗ raté</span>}
        {event.status === 'pending' && <span className="ml-1.5 text-xs text-white/30">en attente</span>}
      </div>
      <span className="text-white/30 text-xs flex-shrink-0">{ago}</span>
    </div>
  )
  if (event.type === 'purchase') return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
      <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-3.5 h-3.5 text-purple-400" /></div>
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm font-bold">{event.pack_type}</span>
        <span className="text-white/40 text-xs ml-1.5">pack acheté · +{event.coins_granted}🪙</span>
      </div>
      <span className="text-white/30 text-xs flex-shrink-0">{ago}</span>
    </div>
  )
  return null
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function HourChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const now = new Date().getHours()
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map((d) => (
        <div key={d.hour} className="flex-1 flex flex-col items-center gap-0.5">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.count / max) * 100}%` }}
            transition={{ duration: 0.5, delay: d.hour * 0.02 }}
            className={`w-full rounded-sm min-h-[2px] ${d.hour === now ? 'bg-yellow-400' : 'bg-white/20'}`}
          />
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function TrackingClient({ stats, recentSignups, recentDuels, recentPredictions, recentPurchases, topUsers, duelChart, fetchedAt }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'activity' | 'users'>('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [userSort, setUserSort] = useState<'battles' | 'coins' | 'predictions' | 'recent'>('battles')
  const [search, setSearch] = useState('')
  const [secondsAgo, setSecondsAgo] = useState(0)

  // Timer since last fetch
  useEffect(() => {
    const t = setInterval(() => setSecondsAgo((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [fetchedAt])

  const refresh = useCallback(() => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }, [router])

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(refresh, 30000)
    return () => clearInterval(t)
  }, [refresh])

  // Merge & sort activity feed
  const feed: FeedEvent[] = [
    ...recentSignups.map((u): FeedEvent => ({ type: 'signup', id: u.id, pseudo: u.pseudo, nation: u.nation, is_vip: u.is_vip, created_at: u.created_at })),
    ...recentDuels.map((d): FeedEvent => ({ type: 'duel', id: d.id, challenger: d.challenger_pseudo, opponent: d.opponent_pseudo, score: `${d.challenger_score ?? 0}-${d.opponent_score ?? 0}`, is_bot: d.is_bot, created_at: d.created_at })),
    ...recentPredictions.map((p): FeedEvent => ({ type: 'prediction', id: p.id, user_id: p.user_id, status: p.status, coins_won: p.coins_won, created_at: p.created_at })),
    ...recentPurchases.map((p): FeedEvent => ({ type: 'purchase', id: p.id, pack_type: p.pack_type, coins_granted: p.coins_granted, created_at: p.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const sortedUsers = [...topUsers]
    .filter((u) => u.pseudo.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (userSort === 'battles') return b.battles_played - a.battles_played
      if (userSort === 'coins') return b.coins - a.coins
      if (userSort === 'predictions') return b.predictions_correct - a.predictions_correct
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const botRatio = stats.duelsToday > 0 ? Math.round((stats.botDuelsToday / stats.duelsToday) * 100) : 0

  const TABS = [
    { key: 'overview', label: '📊 Vue globale', icon: BarChart2 },
    { key: 'activity', label: '⚡ Activité', icon: Activity },
    { key: 'users', label: '👥 Utilisateurs', icon: Users },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-4xl text-white tracking-wide">TRACKING & ANALYTICS</h1>
          <p className="text-white/40 text-sm mt-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Live · Actualisation auto toutes les 30s · dernière MAJ il y a {secondsAgo}s
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
              tab === t.key
                ? 'text-blue-400 border-blue-400'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* KPI Grid */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Utilisateurs</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Total inscrits" value={stats.totalUsers} icon={Users} color="bg-blue-500/15 text-blue-400" />
                <KpiCard label="Nouveaux aujourd'hui" value={stats.newUsersToday} sub={`+${stats.newUsersWeek} cette semaine`} icon={UserPlus} color="bg-cyan-500/15 text-cyan-400" />
                <KpiCard label="Membres VIP" value={stats.vipCount} sub={`${stats.totalUsers > 0 ? Math.round((stats.vipCount / stats.totalUsers) * 100) : 0}% de la base`} icon={Crown} color="bg-yellow-500/15 text-yellow-400" />
                <KpiCard label="Cartes distribuées" value={stats.totalUserCards} icon={Package} color="bg-pink-500/15 text-pink-400" />
              </div>
            </div>

            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Duels</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Total duels" value={stats.totalDuels} icon={Swords} color="bg-orange-500/15 text-orange-400" />
                <KpiCard label="Duels aujourd'hui" value={stats.duelsToday} icon={TrendingUp} color="bg-amber-500/15 text-amber-400" />
                <KpiCard label="Duels actifs maintenant" value={stats.activeDuels} pulse icon={Zap} color="bg-green-500/15 text-green-400" />
                <KpiCard label="Duels vs Bot (aujourd'hui)" value={`${botRatio}%`} sub={`${stats.botDuelsToday} / ${stats.duelsToday}`} icon={Bot} color="bg-gray-500/15 text-gray-400" />
              </div>
            </div>

            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Engagement</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Total pronostics" value={stats.totalPredictions} icon={Target} color="bg-green-500/15 text-green-400" />
                <KpiCard label="Pronostics aujourd'hui" value={stats.predictionsToday} icon={Target} color="bg-emerald-500/15 text-emerald-400" />
                <KpiCard label="Achats aujourd'hui" value={stats.purchasesToday} icon={ShoppingBag} color="bg-purple-500/15 text-purple-400" />
                <KpiCard label="Coins gagnés auj." value={stats.coinsIn.toLocaleString()} sub={`-${stats.coinsOut.toLocaleString()} dépensés`} icon={Coins} color="bg-yellow-500/15 text-yellow-400" />
              </div>
            </div>

            {/* Duel activity chart */}
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-bold text-sm">Activité duels — dernières 24h</p>
                  <p className="text-white/30 text-xs mt-0.5">Duels démarrés par heure (heure en jaune = maintenant)</p>
                </div>
                <Clock className="w-4 h-4 text-white/30" />
              </div>
              <HourChart data={duelChart} />
              <div className="flex justify-between mt-1">
                {[0, 6, 12, 18, 23].map((h) => (
                  <span key={h} className="text-white/20 text-[10px]">{h}h</span>
                ))}
              </div>
            </div>

            {/* Recent signups */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="text-white font-semibold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-400" /> Dernières inscriptions</p>
                <Link href="/admin/users" className="text-blue-400 text-xs hover:underline">Voir tout →</Link>
              </div>
              <div className="divide-y divide-white/5">
                {recentSignups.slice(0, 8).map((u) => (
                  <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/3 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                      {u.photo_url ? <img src={u.photo_url} alt={u.pseudo} className="w-full h-full object-cover" /> : u.pseudo[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm font-medium">{u.pseudo}</span>
                      {u.is_vip && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-black">VIP</span>}
                      <span className="text-white/40 text-xs ml-2">{flag(u.nation)}</span>
                    </div>
                    <span className="text-white/40 text-xs">{timeAgo(u.created_at)}</span>
                    <span className="text-white/60 text-xs">{u.coins.toLocaleString()}🪙</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'activity' && (
          <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
                <Activity className="w-4 h-4 text-green-400" />
                <p className="text-white font-semibold text-sm">Flux d'activité en temps réel</p>
                <span className="ml-auto text-white/30 text-xs">{feed.length} événements récents</span>
              </div>
              <div className="px-5 py-2 max-h-[600px] overflow-y-auto">
                {feed.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-8">Aucune activité récente</p>
                )}
                {feed.map((event) => (
                  <FeedItem key={`${event.type}-${event.id}`} event={event} />
                ))}
              </div>
            </div>

            {/* Recent duels detail */}
            <div className="glass rounded-xl overflow-hidden mt-4">
              <div className="px-5 py-3 border-b border-white/5">
                <p className="text-white font-semibold text-sm flex items-center gap-2"><Swords className="w-4 h-4 text-yellow-400" /> Derniers duels terminés</p>
              </div>
              <div className="divide-y divide-white/5">
                {recentDuels.slice(0, 15).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${d.is_bot ? 'bg-gray-500/15' : 'bg-yellow-500/15'}`}>
                      {d.is_bot ? <Bot className="w-3 h-3 text-gray-400" /> : <Swords className="w-3 h-3 text-yellow-400" />}
                    </div>
                    <span className="text-white font-medium min-w-0 truncate">{d.challenger_pseudo}</span>
                    <span className="text-white/30 text-xs">vs</span>
                    <span className="text-white/60 min-w-0 truncate">{d.opponent_pseudo}</span>
                    <span className="font-black text-white/80 mx-1 tabular-nums">{d.challenger_score ?? 0} — {d.opponent_score ?? 0}</span>
                    {d.winner_id === null && <span className="text-xs text-white/40 px-1.5 py-0.5 rounded bg-white/5">Nul</span>}
                    <span className="ml-auto text-white/30 text-xs flex-shrink-0">{timeAgo(d.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Search + sort */}
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Rechercher un joueur…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-48 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50"
              />
              <div className="flex gap-1.5">
                {(['battles', 'coins', 'predictions', 'recent'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setUserSort(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      userSort === s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {s === 'battles' ? '⚔️ Battles' : s === 'coins' ? '🪙 Coins' : s === 'predictions' ? '⚽ Pronos' : '🕐 Récent'}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-white/30 text-xs">{sortedUsers.length} joueur{sortedUsers.length > 1 ? 's' : ''}</p>

            {/* Users table */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Joueur</th>
                      <th className="px-3 py-3 text-center">Duels</th>
                      <th className="px-3 py-3 text-center">Win%</th>
                      <th className="px-3 py-3 text-center">Série</th>
                      <th className="px-3 py-3 text-center">Pronos ✓</th>
                      <th className="px-3 py-3 text-right">Coins</th>
                      <th className="px-3 py-3 text-right">Inscrit</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedUsers.map((u, i) => {
                      const rateColor = u.win_rate >= 70 ? 'text-green-400' : u.win_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                      return (
                        <tr key={u.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-white/20 text-xs w-5 text-right">{i + 1}</span>
                              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                                {u.photo_url ? <img src={u.photo_url} alt={u.pseudo} className="w-full h-full object-cover" /> : u.pseudo[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white font-semibold">{u.pseudo}</span>
                                  {u.is_vip && <Crown className="w-3 h-3 text-yellow-400" />}
                                </div>
                                <span className="text-white/30 text-xs">{flag(u.nation)} {u.nation}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-white font-bold">{u.battles_played}</span>
                            <span className="text-white/30 text-xs ml-1">({u.battles_won}V/{u.losses}D)</span>
                          </td>
                          <td className={`px-3 py-3 text-center font-black ${rateColor}`}>
                            {u.battles_played > 0 ? `${u.win_rate}%` : '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {u.battle_streak >= 3
                              ? <span className="text-orange-400 font-bold">🔥{u.battle_streak}</span>
                              : <span className="text-white/30">{u.battle_streak}</span>}
                            <span className="text-white/20 text-xs ml-1">best {u.best_streak}</span>
                          </td>
                          <td className="px-3 py-3 text-center text-green-400 font-bold">{u.predictions_correct}</td>
                          <td className="px-3 py-3 text-right text-yellow-400 font-bold">{u.coins.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-white/30 text-xs">{timeAgo(u.created_at)}</td>
                          <td className="px-3 py-3 text-right">
                            <Link href={`/admin/users/${u.id}`} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">Voir →</Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {sortedUsers.length === 0 && (
                <p className="text-white/30 text-sm text-center py-8">Aucun résultat</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
