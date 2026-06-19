'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPageInfo } from '@/components/PresenceTracker'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Users, BarChart3, Globe, Shield, X, Crown, ChevronLeft, ChevronRight,
  RefreshCw, Ban, CheckCircle, Coins, Trash2, Gift, RotateCcw, PackageOpen,
  Swords, AlertTriangle, ScrollText, Settings2, Send, Power, Eye, Receipt,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PresenceEntry { userId: string; pseudo: string; nation: string; photoUrl: string | null; path: string; page: string; online_at: string }
interface AdminUser { id: string; pseudo: string; email: string | null; nation: string; coins: number; battles_played: number; battles_won: number; pack_opened: number | null; is_admin: boolean; is_super_admin: boolean; is_banned: boolean; ban_reason: string | null; last_seen_at: string | null; created_at: string }
interface AuditLog { id: string; admin_pseudo: string; action: string; target_pseudo: string | null; metadata: Record<string, unknown>; created_at: string }
interface LiveBattle { id: string; type: 'duel' | 'penalty'; status: string; is_bot: boolean; created_at: string; challenger: { pseudo: string; nation: string } | null; opponent: { pseudo: string; nation: string } | null }
interface SuspectUser { id: string; pseudo: string; nation: string; coins: number; battles_played: number; battles_won: number; winRate: number; accountAgeDays: number; flags: Array<{ type: string; value: number }> }
interface CardResult { id: string; name: string; rarity: string; image_url: string | null; nation: string | null; type: string }
interface InventoryCard { id: string; card_id: string; obtained_at: string; obtained_via: string | null; cards: CardResult | null }
interface Transaction { id: string; amount: number; reason: string | null; created_at: string }
interface Stats { totalUsers: number; newToday: number; activeToday: number; battlesToday: number; tournoisToday: number; bannedUsers: number; coinsMovedToday: number }
interface Analytics { signups: Array<{ date: string; count: number }>; heatmap: Array<{ hour: number; count: number }>; funnel: Array<{ label: string; count: number }>; neverPlayed: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

const NATION_FLAGS: Record<string, string> = { France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱', Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪', Japan: '🇯🇵', Senegal: '🇸🇳', Croatia: '🇭🇷', Uruguay: '🇺🇾' }
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'
function timeAgo(iso: string): string { const d = Date.now() - new Date(iso).getTime(); const s = Math.floor(d / 1000); if (s < 60) return `${s}s`; const m = Math.floor(s / 60); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}j` }
function fmt(n: number): string { if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'k'; return n.toString() }
const RARITY_COLOR: Record<string, string> = { Legend: 'text-yellow-400 bg-yellow-400/15', Epic: 'text-purple-400 bg-purple-400/15', Rare: 'text-blue-400 bg-blue-400/15', Common: 'text-zinc-400 bg-zinc-400/15' }

async function callAction(userId: string, body: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`/api/admin/super/user/${userId}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json() as { error?: string }
  if (!res.ok) { toast.error(data.error ?? 'Erreur'); return false }
  return true
}

// ── PlayerDetailModal ─────────────────────────────────────────────────────────

function PlayerDetailModal({ user, onClose, onRefresh }: { user: AdminUser; onClose: () => void; onRefresh: () => void }) {
  const [view, setView] = useState<'inventory' | 'transactions'>('inventory')
  const [cards, setCards] = useState<InventoryCard[]>([])
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [loadingTxs, setLoadingTxs] = useState(false)
  const [cardQuery, setCardQuery] = useState('')
  const [cardResults, setCardResults] = useState<CardResult[]>([])
  const [selectedCard, setSelectedCard] = useState<CardResult | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (view === 'inventory' && cards.length === 0) {
      setLoadingCards(true)
      fetch(`/api/admin/super/user/${user.id}/inventory`).then(r => r.json()).then((d: { cards: InventoryCard[] }) => { setCards(d.cards ?? []); setLoadingCards(false) })
    }
    if (view === 'transactions' && txs.length === 0) {
      setLoadingTxs(true)
      fetch(`/api/admin/super/user/${user.id}/transactions`).then(r => r.json()).then((d: { transactions: Transaction[] }) => { setTxs(d.transactions ?? []); setLoadingTxs(false) })
    }
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCardSearch(q: string) {
    setCardQuery(q); setSelectedCard(null)
    if (searchRef.current) clearTimeout(searchRef.current)
    if (q.trim().length < 2) { setCardResults([]); return }
    searchRef.current = setTimeout(() => {
      fetch(`/api/admin/super/cards?q=${encodeURIComponent(q)}`).then(r => r.json()).then((d: { cards: CardResult[] }) => setCardResults(d.cards ?? []))
    }, 300)
  }

  async function giveCard() {
    if (!selectedCard) return
    const ok = await callAction(user.id, { action: 'give_card', cardId: selectedCard.id })
    if (ok) { toast.success(`✅ ${selectedCard.name} donné à ${user.pseudo}`); setSelectedCard(null); setCardQuery(''); setCardResults([]); setCards([]); setLoadingCards(true); fetch(`/api/admin/super/user/${user.id}/inventory`).then(r => r.json()).then((d: { cards: InventoryCard[] }) => { setCards(d.cards ?? []); setLoadingCards(false) }); onRefresh() }
  }

  async function removeCard(cardId: string, cardName: string) {
    if (!confirm(`Retirer "${cardName}" de l'inventaire de ${user.pseudo} ?`)) return
    setRemoving(cardId)
    const ok = await callAction(user.id, { action: 'remove_card', cardId })
    if (ok) { toast.success(`🗑️ Carte retirée`); setCards(prev => { const idx = prev.findIndex(c => c.card_id === cardId); if (idx === -1) return prev; return [...prev.slice(0, idx), ...prev.slice(idx + 1)] }); onRefresh() }
    setRemoving(null)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/8 flex-shrink-0">
          <div>
            <p className="text-white font-black text-lg">{flag(user.nation)} {user.pseudo}</p>
            <p className="text-white/30 text-xs">{user.email} · {fmt(user.coins)} coins · {cards.length} cartes</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 border-b border-white/5 flex-shrink-0">
          {(['inventory', 'transactions'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === v ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
              {v === 'inventory' ? '🃏 Inventaire' : '💰 Transactions'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {view === 'inventory' && (
            <>
              {/* Give card */}
              <div className="space-y-2">
                <p className="text-white/40 text-[10px] uppercase tracking-widest">Donner une carte</p>
                <div className="relative">
                  <input value={cardQuery} onChange={e => handleCardSearch(e.target.value)} placeholder="Chercher une carte par nom…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20" />
                  {cardResults.length > 0 && !selectedCard && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-[#0d0d1a] border border-white/15 rounded-xl z-10 max-h-48 overflow-y-auto">
                      {cardResults.map(c => (
                        <button key={c.id} onClick={() => { setSelectedCard(c); setCardQuery(c.name); setCardResults([]) }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${RARITY_COLOR[c.rarity] ?? 'text-white/40 bg-white/10'}`}>{c.rarity}</span>
                          <span className="text-white text-sm flex-1">{c.name}</span>
                          {c.nation && <span className="text-white/30 text-xs">{flag(c.nation)}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button disabled={!selectedCard} onClick={giveCard}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-bold hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed">
                  <Gift size={13} /> Donner {selectedCard ? `"${selectedCard.name}"` : ''}
                </button>
              </div>

              {/* Cards grid */}
              {loadingCards ? <div className="text-center py-8 text-white/25 text-sm">Chargement…</div> : (
                <div className="space-y-1.5">
                  {cards.map(uc => {
                    const c = uc.cards
                    return (
                      <div key={uc.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 hover:bg-white/5 group">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${RARITY_COLOR[c?.rarity ?? ''] ?? 'text-white/30 bg-white/5'}`}>{c?.rarity ?? '?'}</span>
                        <span className="text-white text-sm flex-1 truncate">{c?.name ?? uc.card_id}</span>
                        {c?.nation && <span className="text-white/30 text-xs">{flag(c.nation)}</span>}
                        <span className="text-white/20 text-[10px]">{uc.obtained_via ?? '—'}</span>
                        <button onClick={() => c && removeCard(uc.card_id, c.name)} disabled={removing === uc.card_id}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-all flex-shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                  {cards.length === 0 && <p className="text-center text-white/25 text-sm py-8">Aucune carte</p>}
                </div>
              )}
            </>
          )}

          {view === 'transactions' && (
            loadingTxs ? <div className="text-center py-8 text-white/25 text-sm">Chargement…</div> : (
              <div className="space-y-1.5">
                {txs.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3">
                    <span className={`font-mono font-bold text-sm tabular-nums w-20 flex-shrink-0 ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.amount >= 0 ? '+' : ''}{fmt(t.amount)}
                    </span>
                    <span className="text-white/50 text-xs flex-1 truncate">{t.reason ?? '—'}</span>
                    <span className="text-white/25 text-[10px] flex-shrink-0">{timeAgo(t.created_at)}</span>
                  </div>
                ))}
                {txs.length === 0 && <p className="text-center text-white/25 text-sm py-8">Aucune transaction</p>}
              </div>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── ActionModal ───────────────────────────────────────────────────────────────

function ActionModal({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(100)
  const [reason, setReason] = useState('')
  const [showDetail, setShowDetail] = useState(false)

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setLoading(true)
    const ok = await callAction(user.id, { action, amount, reason, ...extra })
    if (ok) { toast.success(`✅ "${action}" effectué`); onDone(); onClose() }
    setLoading(false)
  }

  if (showDetail) return <PlayerDetailModal user={user} onClose={() => { setShowDetail(false); onClose() }} onRefresh={onDone} />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-black text-xl">{flag(user.nation)} {user.pseudo}</p>
            <p className="text-white/40 text-xs mt-0.5">{user.email} · {fmt(user.coins)} coins · {user.battles_played} battles</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40"><X size={16} /></button>
        </div>

        {/* Coins */}
        <div className="space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-widest">💰 Coins</p>
          <div className="flex gap-2">
            <input type="number" value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            <button disabled={loading} onClick={() => act('add_coins')} className="px-3 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-bold hover:bg-green-500/30 disabled:opacity-50">+ Ajouter</button>
            <button disabled={loading} onClick={() => act('remove_coins')} className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/30 disabled:opacity-50">− Retirer</button>
          </div>
        </div>

        {/* Reason */}
        <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison (optionnel)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowDetail(true)} className="py-2.5 rounded-xl bg-purple-500/15 text-purple-400 text-xs font-bold hover:bg-purple-500/25 flex items-center justify-center gap-1.5">
            <Eye size={12} /> Inventaire / Txs
          </button>
          <button disabled={loading} onClick={() => { if (confirm(`Remettre à zéro les stats de ${user.pseudo} ?`)) act('reset_stats') }}
            className="py-2.5 rounded-xl bg-orange-500/15 text-orange-400 text-xs font-bold hover:bg-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-1.5">
            <RotateCcw size={12} /> Reset stats
          </button>
          {!user.is_admin
            ? <button disabled={loading} onClick={() => act('make_admin')} className="py-2.5 rounded-xl bg-blue-500/15 text-blue-400 text-xs font-bold hover:bg-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-1.5"><Shield size={12} /> Promouvoir admin</button>
            : <button disabled={loading} onClick={() => act('remove_admin')} className="py-2.5 rounded-xl bg-zinc-500/15 text-zinc-400 text-xs font-bold hover:bg-zinc-500/25 disabled:opacity-50 flex items-center justify-center gap-1.5"><Shield size={12} /> Retirer admin</button>
          }
          {!user.is_banned
            ? <button disabled={loading} onClick={() => act('ban')} className="py-2.5 rounded-xl bg-red-500/15 text-red-400 text-xs font-bold hover:bg-red-500/25 disabled:opacity-50 flex items-center justify-center gap-1.5"><Ban size={12} /> Bannir</button>
            : <button disabled={loading} onClick={() => act('unban')} className="py-2.5 rounded-xl bg-green-500/15 text-green-400 text-xs font-bold hover:bg-green-500/25 disabled:opacity-50 flex items-center justify-center gap-1.5"><CheckCircle size={12} /> Débannir</button>
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

  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 5000); return () => clearInterval(t) }, [])

  useEffect(() => {
    const ch = supabase.channel('global-presence')
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<PresenceEntry>()
      const entries: PresenceEntry[] = []
      for (const p of Object.values(state)) { const e = p[0]; if (e) entries.push(e) }
      setPresences(entries.sort((a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime()))
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
      const np = newPresences[0] as unknown as PresenceEntry
      if (!np) return
      setPresences(prev => [np, ...prev.filter(p => p.userId !== np.userId)].sort((a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime()))
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const lp = leftPresences[0] as unknown as PresenceEntry
      if (lp) setPresences(prev => prev.filter(p => p.userId !== lp.userId))
    })
    .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = presences.filter(p => !filter || p.pseudo.toLowerCase().includes(filter.toLowerCase()) || p.page.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/30">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-bold">{presences.length} en ligne</span>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrer…"
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20" />
        </div>
      </div>
      <div className="space-y-1.5">
        {filtered.map(p => {
          const info = getPageInfo(p.path)
          return (
            <motion.div key={p.userId} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5">
              <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-sm font-black text-white/70 flex-shrink-0">{p.pseudo[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{flag(p.nation)} {p.pseudo}</p>
                <p className="text-white/25 text-[10px] font-mono truncate">{p.path}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${info.color}`}>{p.page}</span>
              <span className="text-[10px] font-mono w-8 text-right text-white/25 flex-shrink-0">{timeAgo(p.online_at)}</span>
            </motion.div>
          )
        })}
        {filtered.length === 0 && <p className="text-center py-12 text-white/25 text-sm">Aucun utilisateur en ligne</p>}
      </div>
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
    const r = await fetch(`/api/admin/super/users?q=${encodeURIComponent(q)}&page=${p}`)
    const d = await r.json() as { users: AdminUser[]; total: number }
    setUsers(d.users ?? []); setTotal(d.total ?? 0); setLoading(false)
  }, [])

  useEffect(() => { fetchUsers('', 1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(val: string) { setQuery(val); setPage(1); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => fetchUsers(val, 1), 350) }

  const totalPages = Math.ceil(total / 30)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={e => handleSearch(e.target.value)} placeholder="Rechercher un pseudo…"
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20" />
        </div>
        <button onClick={() => fetchUsers(query, page)} className="p-2 rounded-xl hover:bg-white/8 text-white/40 hover:text-white"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        <span className="text-white/30 text-xs">{total} utilisateurs</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-white/25 text-[10px] uppercase tracking-wider border-b border-white/5">
            <th className="text-left pb-2 pr-4">Joueur</th>
            <th className="text-right pb-2 pr-4">Coins</th>
            <th className="text-right pb-2 pr-4">W/P</th>
            <th className="text-center pb-2 pr-4">Rôle</th>
            <th className="text-left pb-2 pr-4">Vu</th>
            <th className="text-center pb-2">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-white/4">
            {loading && users.length === 0
              ? <tr><td colSpan={6} className="text-center py-12 text-white/25">Chargement…</td></tr>
              : users.map(u => (
                <tr key={u.id} className="hover:bg-white/3 transition-colors">
                  <td className="py-2.5 pr-4"><div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-xs font-black text-white/60 flex-shrink-0">{u.pseudo[0]?.toUpperCase()}</div>
                    <div className="min-w-0">
                      <p className={`font-bold truncate max-w-[140px] ${u.is_banned ? 'text-red-400 line-through' : 'text-white'}`}>{flag(u.nation)} {u.pseudo}</p>
                      <p className="text-white/25 text-[10px] truncate max-w-[140px]">{u.email ?? '—'}</p>
                    </div>
                  </div></td>
                  <td className="py-2.5 pr-4 text-right text-white/70 font-mono tabular-nums">{fmt(u.coins)}</td>
                  <td className="py-2.5 pr-4 text-right text-white/50 text-xs tabular-nums">{u.battles_won}/{u.battles_played}</td>
                  <td className="py-2.5 pr-4 text-center">
                    {u.is_super_admin && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">SUPER</span>}
                    {u.is_admin && !u.is_super_admin && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">ADMIN</span>}
                    {u.is_banned && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">BANNI</span>}
                    {!u.is_admin && !u.is_banned && <span className="text-[9px] text-white/20">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-white/30 text-xs">{u.last_seen_at ? timeAgo(u.last_seen_at) : '—'}</td>
                  <td className="py-2.5 text-center"><button onClick={() => setSelectedUser(u)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs font-bold hover:bg-white/10 hover:text-white">Gérer</button></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => { const p = page - 1; setPage(p); fetchUsers(query, p) }} disabled={page <= 1} className="p-2 rounded-lg hover:bg-white/8 disabled:opacity-30 text-white/50"><ChevronLeft size={16} /></button>
          <span className="text-white/40 text-sm">Page {page} / {totalPages}</span>
          <button onClick={() => { const p = page + 1; setPage(p); fetchUsers(query, p) }} disabled={page >= totalPages} className="p-2 rounded-lg hover:bg-white/8 disabled:opacity-30 text-white/50"><ChevronRight size={16} /></button>
        </div>
      )}
      <AnimatePresence>{selectedUser && <ActionModal user={selectedUser} onClose={() => setSelectedUser(null)} onDone={() => fetchUsers(query, page)} />}</AnimatePresence>
    </div>
  )
}

// ── BattlesTab ────────────────────────────────────────────────────────────────

function BattlesTab() {
  const [battles, setBattles] = useState<LiveBattle[]>([])
  const [loading, setLoading] = useState(true)
  const [ending, setEnding] = useState<string | null>(null)

  const fetch_ = async () => {
    setLoading(true)
    const r = await fetch('/api/admin/super/battles')
    const d = await r.json() as { battles: LiveBattle[] }
    setBattles(d.battles ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch_() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function forceEnd(b: LiveBattle) {
    if (!confirm(`Forcer la fin de cette ${b.type === 'duel' ? 'battle' : 'séance de tirs au but'} ?`)) return
    setEnding(b.id)
    const res = await fetch(`/api/admin/super/battles/${b.id}/force-end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: b.type }) })
    if (res.ok) { toast.success('Battle annulée'); setBattles(prev => prev.filter(x => x.id !== b.id)) }
    else toast.error('Erreur')
    setEnding(null)
  }

  const STATUS_LABEL: Record<string, string> = { open: 'En attente', invited: 'Invité', picking: 'Picks', stealing: 'Steal', waiting: 'Attente' }
  const STATUS_COLOR: Record<string, string> = { open: 'text-blue-400', invited: 'text-yellow-400', picking: 'text-green-400', stealing: 'text-orange-400', waiting: 'text-purple-400' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30">
          <Swords size={12} className="text-orange-400" />
          <span className="text-orange-400 text-xs font-bold">{battles.length} battles actives</span>
        </div>
        <button onClick={fetch_} className="p-2 rounded-xl hover:bg-white/8 text-white/40"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
      </div>
      {loading ? <div className="text-center py-12 text-white/25">Chargement…</div> : battles.length === 0 ? (
        <div className="text-center py-12 text-white/25 text-sm">Aucune battle active</div>
      ) : (
        <div className="space-y-2">
          {battles.map(b => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5">
              <span className={`text-[9px] font-black px-2 py-1 rounded flex-shrink-0 ${b.type === 'duel' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {b.type === 'duel' ? '⚔️ Duel' : '⚽ Tirs'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold">
                  {b.challenger ? `${flag(b.challenger.nation)} ${b.challenger.pseudo}` : '?'}
                  <span className="text-white/30 mx-2">vs</span>
                  {b.opponent ? `${b.is_bot ? '' : flag(b.opponent.nation)} ${b.opponent.pseudo}` : '?'}
                </p>
                <p className="text-white/30 text-[10px]">{timeAgo(b.created_at)} · id: {b.id.slice(0, 8)}</p>
              </div>
              <span className={`text-xs font-bold flex-shrink-0 ${STATUS_COLOR[b.status] ?? 'text-white/40'}`}>{STATUS_LABEL[b.status] ?? b.status}</span>
              <button onClick={() => forceEnd(b)} disabled={ending === b.id} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 disabled:opacity-50 flex-shrink-0">
                Forcer fin
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── AnalyticsTab ──────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/super/stats').then(r => r.json()) as Promise<Stats>,
      fetch('/api/admin/super/analytics').then(r => r.json()) as Promise<Analytics>,
    ]).then(([s, a]) => { setStats(s); setAnalytics(a); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center py-16 text-white/25">Chargement des analytics…</div>

  const maxSignup = Math.max(...(analytics?.signups ?? []).map(x => x.count), 1)
  const maxHeat = Math.max(...(analytics?.heatmap ?? []).map(x => x.count), 1)
  const funnelMax = analytics?.funnel[0]?.count ?? 1

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: fmt(stats?.totalUsers ?? 0), icon: '👥' },
          { label: 'Nouveaux auj.', value: fmt(stats?.newToday ?? 0), icon: '✨' },
          { label: 'Actifs auj.', value: fmt(stats?.activeToday ?? 0), icon: '🟢' },
          { label: 'Battles auj.', value: fmt(stats?.battlesToday ?? 0), icon: '⚔️' },
        ].map(c => (
          <div key={c.label} className="bg-white/3 rounded-xl p-4 border border-white/5">
            <p className="text-xl mb-1">{c.icon}</p>
            <p className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{c.value}</p>
            <p className="text-white/35 text-[10px]">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Daily signups bar chart */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Inscriptions — 14 derniers jours</p>
        <div className="flex items-end gap-1 h-24">
          {(analytics?.signups ?? []).map(({ date, count }) => (
            <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="relative w-full" style={{ height: '80px' }}>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-500/40 rounded-t transition-all group-hover:bg-blue-400/60"
                  style={{ height: `${Math.max(2, (count / maxSignup) * 80)}px` }} />
              </div>
              <span className="text-[8px] text-white/20 hidden group-hover:block absolute translate-y-[-90px] bg-black/80 px-1.5 py-0.5 rounded">
                {count}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-white/20 mt-1">
          <span>{analytics?.signups[0]?.date?.slice(5)}</span>
          <span>{analytics?.signups[analytics.signups.length - 1]?.date?.slice(5)}</span>
        </div>
      </div>

      {/* Funnel */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Funnel utilisateurs</p>
        <div className="space-y-2">
          {(analytics?.funnel ?? []).map(({ label, count }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">{label}</span>
                <span className="text-white font-bold tabular-nums">{fmt(count)} <span className="text-white/30">({funnelMax > 0 ? Math.round((count / funnelMax) * 100) : 0}%)</span></span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                  style={{ width: `${funnelMax > 0 ? (count / funnelMax) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap by hour */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Activité par heure (7 derniers jours)</p>
        <div className="grid grid-cols-12 gap-1">
          {(analytics?.heatmap ?? []).map(({ hour, count }) => {
            const intensity = maxHeat > 0 ? count / maxHeat : 0
            return (
              <div key={hour} title={`${hour}h: ${count}`} className="aspect-square rounded flex items-center justify-center text-[9px] font-bold cursor-default"
                style={{ backgroundColor: `rgba(59,130,246,${Math.max(0.05, intensity * 0.8)})`, color: intensity > 0.5 ? 'white' : 'rgba(255,255,255,0.4)' }}>
                {hour}
              </div>
            )
          })}
        </div>
        <p className="text-white/25 text-[10px] mt-1">Basé sur last_seen_at · clair = peu actif · foncé = très actif</p>
      </div>
    </div>
  )
}

// ── SecurityTab ───────────────────────────────────────────────────────────────

function SecurityTab() {
  const [suspects, setSuspects] = useState<SuspectUser[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loadingSuspects, setLoadingSuspects] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [logPage, setLogPage] = useState(1)
  const [logTotal, setLogTotal] = useState(0)

  const fetchLogs = async (p: number) => {
    setLoadingLogs(true)
    const r = await fetch(`/api/admin/super/audit?page=${p}`)
    const d = await r.json() as { logs: AuditLog[]; total: number }
    setLogs(d.logs ?? []); setLogTotal(d.total ?? 0); setLoadingLogs(false)
  }

  useEffect(() => {
    fetch('/api/admin/super/cheaters').then(r => r.json()).then((d: { suspects: SuspectUser[] }) => { setSuspects(d.suspects ?? []); setLoadingSuspects(false) })
    fetchLogs(1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const FLAG_LABELS: Record<string, string> = { win_rate_92: 'WR>92%', coins_300k: 'Coins>300k', rapid_farming: 'Farm rapide', volume_farming: 'Volume' }
  const ACTION_LABELS: Record<string, string> = { ban: '🚫 Ban', unban: '✅ Unban', add_coins: '💰 +Coins', remove_coins: '💸 -Coins', make_admin: '🛡️ Admin+', remove_admin: '🛡️ Admin-', give_card: '🃏 Carte+', remove_card: '🗑️ Carte-', reset_stats: '🔄 Stats reset', broadcast: '📢 Broadcast', maintenance_on: '🔴 Maintenance ON', maintenance_off: '🟢 Maintenance OFF', force_end_battle: '⏹️ Force end' }

  return (
    <div className="space-y-8">
      {/* Suspects */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-orange-400" />
          <p className="text-white font-bold text-sm">Alertes triche ({suspects.length})</p>
        </div>
        {loadingSuspects ? <div className="text-white/25 text-sm">Chargement…</div> : suspects.length === 0 ? (
          <div className="text-center py-8 text-white/25 text-sm">Aucune alerte</div>
        ) : (
          <div className="space-y-2">
            {suspects.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/5 border border-orange-500/15 hover:bg-orange-500/8">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{flag(s.nation)} {s.pseudo}</p>
                  <p className="text-white/40 text-xs">{s.battles_won}/{s.battles_played} ({Math.round(s.winRate * 100)}% WR) · {fmt(s.coins)} coins · {s.accountAgeDays}j</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.flags.map(f => (
                    <span key={f.type} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">{FLAG_LABELS[f.type] ?? f.type}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScrollText size={14} className="text-white/50" />
            <p className="text-white font-bold text-sm">Journal d&apos;audit ({logTotal})</p>
          </div>
        </div>
        {loadingLogs ? <div className="text-white/25 text-sm">Chargement…</div> : (
          <>
            <div className="space-y-1.5">
              {logs.map(l => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3">
                  <span className="text-xs font-bold text-white/60 flex-shrink-0">{ACTION_LABELS[l.action] ?? l.action}</span>
                  <span className="text-white/40 text-xs flex-1 truncate">{l.admin_pseudo} → {l.target_pseudo ?? 'global'}</span>
                  <span className="text-white/20 text-[10px] flex-shrink-0 font-mono">{timeAgo(l.created_at)}</span>
                </div>
              ))}
            </div>
            {Math.ceil(logTotal / 50) > 1 && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <button onClick={() => { const p = logPage - 1; setLogPage(p); fetchLogs(p) }} disabled={logPage <= 1} className="p-2 rounded-lg hover:bg-white/8 disabled:opacity-30 text-white/50"><ChevronLeft size={14} /></button>
                <span className="text-white/40 text-xs">Page {logPage} / {Math.ceil(logTotal / 50)}</span>
                <button onClick={() => { const p = logPage + 1; setLogPage(p); fetchLogs(p) }} disabled={logPage >= Math.ceil(logTotal / 50)} className="p-2 rounded-lg hover:bg-white/8 disabled:opacity-30 text-white/50"><ChevronRight size={14} /></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── ControlsTab ───────────────────────────────────────────────────────────────

function ControlsTab() {
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null)
  const [maintenanceMsg, setMaintenanceMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/dashboard')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/admin/super/maintenance').then(r => r.json()).then((d: { enabled: boolean; message: string }) => {
      setMaintenance(d); setMaintenanceMsg(d.message ?? '')
    })
  }, [])

  async function toggleMaintenance(enabled: boolean) {
    setSaving(true)
    const res = await fetch('/api/admin/super/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled, message: maintenanceMsg }) })
    if (res.ok) { setMaintenance({ enabled, message: maintenanceMsg }); toast.success(enabled ? '🔴 Maintenance activée' : '🟢 App en ligne') }
    else toast.error('Erreur')
    setSaving(false)
  }

  async function sendBroadcast() {
    if (!title.trim() || !body.trim()) { toast.error('Titre et message requis'); return }
    if (!confirm(`Envoyer une notification à TOUS les utilisateurs ?`)) return
    setSending(true)
    const res = await fetch('/api/admin/super/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body, url }) })
    if (res.ok) { toast.success('📢 Notification envoyée à tous !'); setTitle(''); setBody('') }
    else toast.error('Erreur')
    setSending(false)
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Maintenance mode */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Power size={14} className={maintenance?.enabled ? 'text-red-400' : 'text-green-400'} />
          <p className="text-white font-bold text-sm">Mode maintenance</p>
          {maintenance && (
            <span className={`text-[9px] font-black px-2 py-0.5 rounded ${maintenance.enabled ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {maintenance.enabled ? 'ACTIF' : 'INACTIF'}
            </span>
          )}
        </div>
        <div>
          <p className="text-white/40 text-xs mb-2">Message affiché aux utilisateurs</p>
          <input value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20" />
        </div>
        <div className="flex gap-3">
          <button disabled={saving || maintenance?.enabled} onClick={() => toggleMaintenance(true)}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/30 disabled:opacity-40 flex items-center justify-center gap-2">
            <Power size={13} /> Activer maintenance
          </button>
          <button disabled={saving || !maintenance?.enabled} onClick={() => toggleMaintenance(false)}
            className="flex-1 py-2.5 rounded-xl bg-green-500/20 text-green-400 font-bold text-sm hover:bg-green-500/30 disabled:opacity-40 flex items-center justify-center gap-2">
            <Power size={13} /> Remettre en ligne
          </button>
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Broadcast */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Send size={14} className="text-blue-400" />
          <p className="text-white font-bold text-sm">Notification push broadcast</p>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-white/40 text-xs mb-1">Titre</p>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Mise à jour 2.0 disponible !"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20" />
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Message</p>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Ex: Nouvelles cartes Legend disponibles en boutique…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20 resize-none" />
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">URL de destination</p>
            <input value={url} onChange={e => setUrl(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20" />
          </div>
          <button disabled={sending || !title.trim() || !body.trim()} onClick={sendBroadcast}
            className="w-full py-3 rounded-xl bg-blue-500/20 text-blue-400 font-bold text-sm hover:bg-blue-500/30 disabled:opacity-40 flex items-center justify-center gap-2">
            <Send size={14} /> {sending ? 'Envoi…' : 'Envoyer à tous les utilisateurs'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'presence' | 'users' | 'battles' | 'analytics' | 'security' | 'controls'

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'presence',  label: 'Présence',     icon: <Globe size={13} /> },
  { id: 'users',     label: 'Utilisateurs', icon: <Users size={13} /> },
  { id: 'battles',   label: 'Battles Live', icon: <Swords size={13} /> },
  { id: 'analytics', label: 'Analytics',    icon: <BarChart3 size={13} /> },
  { id: 'security',  label: 'Sécurité',     icon: <AlertTriangle size={13} /> },
  { id: 'controls',  label: 'Contrôles',    icon: <Settings2 size={13} /> },
]

const TAB_ICONS_SIDE: Record<Tab, React.ReactNode> = {
  presence:  <Globe size={14} />,
  users:     <Users size={14} />,
  battles:   <Swords size={14} />,
  analytics: <BarChart3 size={14} />,
  security:  <AlertTriangle size={14} />,
  controls:  <Settings2 size={14} />,
}

export function SuperAdminClient({ superAdminEmail }: { superAdminEmail: string }) {
  const [tab, setTab] = useState<Tab>('presence')

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
          <Crown size={22} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>SUPER ADMIN</h1>
          <p className="text-white/30 text-xs">{superAdminEmail} · Accès total</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs (desktop) */}
        <aside className="hidden sm:flex flex-col gap-1 w-40 flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-all ${tab === t.id ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              {TAB_ICONS_SIDE[t.id]} {t.label}
            </button>
          ))}
        </aside>

        {/* Mobile tabs */}
        <div className="sm:hidden flex gap-1 p-1 glass rounded-xl border border-white/5 w-full overflow-x-auto mb-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${tab === t.id ? 'bg-yellow-500/20 text-yellow-400' : 'text-white/40 hover:text-white/70'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 glass rounded-2xl border border-white/5 p-6">
          <AnimatePresence mode="wait">
            {tab === 'presence'  && <motion.div key="presence"  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><PresenceTab /></motion.div>}
            {tab === 'users'     && <motion.div key="users"     initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><UsersTab /></motion.div>}
            {tab === 'battles'   && <motion.div key="battles"   initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><BattlesTab /></motion.div>}
            {tab === 'analytics' && <motion.div key="analytics" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><AnalyticsTab /></motion.div>}
            {tab === 'security'  && <motion.div key="security"  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><SecurityTab /></motion.div>}
            {tab === 'controls'  && <motion.div key="controls"  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><ControlsTab /></motion.div>}
          </AnimatePresence>
        </div>
      </div>

      {/* Icon legend for non-obvious ones */}
      <div className="hidden">
        <Coins /><PackageOpen /><Receipt />
      </div>
    </div>
  )
}
