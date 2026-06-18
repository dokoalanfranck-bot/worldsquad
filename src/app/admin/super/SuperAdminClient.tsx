'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPageInfo } from '@/components/PresenceTracker'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, BarChart3, Globe, Shield, Coins, Ban, CheckCircle, ChevronLeft, ChevronRight, RefreshCw, Crown, X } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PresenceEntry {
  userId: string
  pseudo: string
  nation: string
  photoUrl: string | null
  path: string
  page: string
  online_at: string
}

interface AdminUser {
  id: string
  pseudo: string
  email: string | null
  nation: string
  photo_url: string | null
  coins: number
  battles_played: number
  battles_won: number
  pack_opened: number | null
  is_admin: boolean
  is_super_admin: boolean
  is_banned: boolean
  ban_reason: string | null
  last_seen_at: string | null
  created_at: string
}

interface Stats {
  totalUsers: number
  newToday: number
  activeToday: number
  battlesToday: number
  tournoisToday: number
  bannedUsers: number
  coinsMovedToday: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪',
  Japan: '🇯🇵', Senegal: '🇸🇳', Croatia: '🇭🇷', Uruguay: '🇺🇾',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

// ── ActionModal ───────────────────────────────────────────────────────────────

function ActionModal({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(100)
  const [reason, setReason] = useState('')

  async function doAction(action: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/super/user/${user.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amount, reason }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success(`✅ Action "${action}" effectuée`)
      onDone()
      onClose()
    } catch { toast.error('Erreur réseau') }
    finally { setLoading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-black text-xl">{flag(user.nation)} {user.pseudo}</p>
            <p className="text-white/40 text-xs mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40">
            <X size={16} />
          </button>
        </div>

        {/* Coins */}
        <div className="space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-widest">💰 Coins ({user.coins} actuels)</p>
          <div className="flex gap-2">
            <input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            <button disabled={loading} onClick={() => doAction('add_coins')}
              className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-bold hover:bg-green-500/30 disabled:opacity-50">
              + Ajouter
            </button>
            <button disabled={loading} onClick={() => doAction('remove_coins')}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/30 disabled:opacity-50">
              − Retirer
            </button>
          </div>
        </div>

        {/* Reason */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Raison (optionnel)</p>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Compensation bug, reward événement…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
        </div>

        {/* Admin toggle */}
        <div className="flex gap-2">
          {!user.is_admin
            ? <button disabled={loading} onClick={() => doAction('make_admin')}
                className="flex-1 py-2.5 rounded-xl bg-blue-500/20 text-blue-400 text-sm font-bold hover:bg-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Shield size={13} /> Promouvoir Admin
              </button>
            : !user.is_super_admin && <button disabled={loading} onClick={() => doAction('remove_admin')}
                className="flex-1 py-2.5 rounded-xl bg-zinc-500/20 text-zinc-400 text-sm font-bold hover:bg-zinc-500/30 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Shield size={13} /> Retirer Admin
              </button>
          }
          {!user.is_banned
            ? <button disabled={loading} onClick={() => doAction('ban')}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/30 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Ban size={13} /> Bannir
              </button>
            : <button disabled={loading} onClick={() => doAction('unban')}
                className="flex-1 py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-bold hover:bg-green-500/30 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <CheckCircle size={13} /> Débannir
              </button>
          }
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── PresenceTab ───────────────────────────────────────────────────────────────

function PresenceTab() {
  const supabase = createClient()
  const [presences, setPresences] = useState<PresenceEntry[]>([])
  const [filter, setFilter] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const ch = supabase.channel('global-presence')
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<PresenceEntry>()
      const entries: PresenceEntry[] = []
      for (const presences of Object.values(state)) {
        const p = presences[0]
        if (p) entries.push(p)
      }
      entries.sort((a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime())
      setPresences(entries)
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
      setPresences((prev) => {
        const np = newPresences[0] as unknown as PresenceEntry
        if (!np) return prev
        const filtered = prev.filter((p) => p.userId !== np.userId)
        return [np, ...filtered].sort((a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime())
      })
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const lp = leftPresences[0] as unknown as PresenceEntry
      if (lp) setPresences((prev) => prev.filter((p) => p.userId !== lp.userId))
    })
    .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = presences.filter((p) =>
    !filter || p.pseudo.toLowerCase().includes(filter.toLowerCase()) || p.page.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/30">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-bold">{presences.length} en ligne</span>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer par pseudo ou page…"
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/25 text-sm">Aucun utilisateur en ligne</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((p) => {
            const info = getPageInfo(p.path)
            const isRecent = Date.now() - new Date(p.online_at).getTime() < 60000
            return (
              <motion.div key={p.userId} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-colors">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-sm font-black text-white/70 flex-shrink-0">
                  {p.pseudo[0]?.toUpperCase()}
                </div>
                {/* Pseudo + nation */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{flag(p.nation)} {p.pseudo}</p>
                  <p className="text-white/30 text-[10px] font-mono truncate">{p.path}</p>
                </div>
                {/* Page badge */}
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${info.color}`}>
                  {p.page}
                </span>
                {/* Time */}
                <span className={`text-[10px] font-mono w-8 text-right flex-shrink-0 ${isRecent ? 'text-green-400' : 'text-white/25'}`}>
                  {timeAgo(p.online_at)}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
      {/* hidden dep to force re-render for timeAgo */}
      <span className="sr-only">{tick}</span>
    </div>
  )
}

// ── UsersTab ──────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/super/users?q=${encodeURIComponent(q)}&page=${p}`)
      const data = await res.json() as { users: AdminUser[]; total: number }
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers(query, page) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(val: string) {
    setQuery(val)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchUsers(val, 1), 350)
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher un pseudo…"
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20" />
        </div>
        <button onClick={() => fetchUsers(query, page)} className="p-2 rounded-xl hover:bg-white/8 text-white/40 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-white/30 text-xs">{total} utilisateurs</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/25 text-[10px] uppercase tracking-wider border-b border-white/5">
              <th className="text-left pb-2 pr-4">Joueur</th>
              <th className="text-right pb-2 pr-4">💰 Coins</th>
              <th className="text-right pb-2 pr-4">⚔️ W/P</th>
              <th className="text-center pb-2 pr-4">Rôle</th>
              <th className="text-left pb-2 pr-4">Vu</th>
              <th className="text-center pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {loading && users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-white/25">Chargement…</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-white/3 transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-xs font-black text-white/60 flex-shrink-0">
                      {u.pseudo[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold truncate max-w-[140px] ${u.is_banned ? 'text-red-400 line-through' : 'text-white'}`}>
                        {flag(u.nation)} {u.pseudo}
                      </p>
                      <p className="text-white/25 text-[10px] truncate max-w-[140px]">{u.email ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-right text-white/70 font-mono tabular-nums">
                  {formatNumber(u.coins)}
                </td>
                <td className="py-2.5 pr-4 text-right text-white/50 text-xs tabular-nums">
                  {u.battles_won}/{u.battles_played}
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center justify-center gap-1">
                    {u.is_super_admin && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">SUPER</span>}
                    {u.is_admin && !u.is_super_admin && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">ADMIN</span>}
                    {u.is_banned && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">BANNI</span>}
                    {!u.is_admin && !u.is_banned && <span className="text-[9px] text-white/20">—</span>}
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-white/30 text-xs">
                  {u.last_seen_at ? timeAgo(u.last_seen_at) : '—'}
                </td>
                <td className="py-2.5 text-center">
                  <button onClick={() => setSelectedUser(u)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors">
                    Gérer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => { const p = page - 1; setPage(p); fetchUsers(query, p) }} disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-white/8 disabled:opacity-30 text-white/50">
            <ChevronLeft size={16} />
          </button>
          <span className="text-white/40 text-sm">Page {page} / {totalPages}</span>
          <button onClick={() => { const p = page + 1; setPage(p); fetchUsers(query, p) }} disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-white/8 disabled:opacity-30 text-white/50">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {selectedUser && (
          <ActionModal user={selectedUser} onClose={() => setSelectedUser(null)} onDone={() => fetchUsers(query, page)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── StatsTab ──────────────────────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/super/stats')
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cards = stats ? [
    { label: 'Total utilisateurs', value: formatNumber(stats.totalUsers), icon: '👥', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20' },
    { label: 'Nouveaux aujourd\'hui', value: formatNumber(stats.newToday), icon: '✨', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/20' },
    { label: 'Actifs aujourd\'hui', value: formatNumber(stats.activeToday), icon: '🟢', color: 'from-green-500/20 to-green-600/10 border-green-500/20' },
    { label: 'Battles aujourd\'hui', value: formatNumber(stats.battlesToday), icon: '⚔️', color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/20' },
    { label: 'Tournois aujourd\'hui', value: formatNumber(stats.tournoisToday), icon: '🏆', color: 'from-orange-500/20 to-orange-600/10 border-orange-500/20' },
    { label: 'Comptes bannis', value: formatNumber(stats.bannedUsers), icon: '🚫', color: 'from-red-500/20 to-red-600/10 border-red-500/20' },
    { label: 'Coins circulés auj.', value: formatNumber(stats.coinsMovedToday), icon: '💰', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/20' },
  ] : []

  if (loading) return <div className="text-center py-16 text-white/25">Chargement des stats…</div>

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${c.color} border rounded-2xl p-5 space-y-2`}>
          <p className="text-2xl">{c.icon}</p>
          <p className="text-3xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{c.value}</p>
          <p className="text-white/40 text-xs">{c.label}</p>
        </motion.div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'presence' | 'users' | 'stats'

export function SuperAdminClient({ superAdminEmail }: { superAdminEmail: string }) {
  const [tab, setTab] = useState<Tab>('presence')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'presence', label: 'Présence Live', icon: <Globe size={14} /> },
    { id: 'users',    label: 'Utilisateurs',  icon: <Users size={14} /> },
    { id: 'stats',    label: 'Stats',          icon: <BarChart3 size={14} /> },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
          <Crown size={22} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            SUPER ADMIN
          </h1>
          <p className="text-white/30 text-xs">{superAdminEmail} · Accès total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl border border-white/5 w-fit">
        {tabs.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === id
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass rounded-2xl border border-white/5 p-6">
        <AnimatePresence mode="wait">
          {tab === 'presence' && (
            <motion.div key="presence" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PresenceTab />
            </motion.div>
          )}
          {tab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <UsersTab />
            </motion.div>
          )}
          {tab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <StatsTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
