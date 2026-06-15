'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, MessageSquare, Swords, Check, X, Search, Clock, Send, ChevronLeft, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FriendUser { id: string; pseudo: string; nation: string; photo_url: string | null; last_seen_at?: string | null }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Friendship = Record<string, any>
interface Message { id: string; sender_id: string; receiver_id: string; text: string; read_at: string | null; created_at: string }

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

const QUICK_MSGS = ['GG 🏆', 'Let\'s go ! ⚡', 'Tu vas perdre 😅', 'Revanche ? 🔥', 'Bien joué 👏', 'Prêt pour le duel ? ⚔️']

function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SocialClient({ currentUserId, initialFriendships }: { currentUserId: string; initialFriendships: Friendship[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends')
  const [friendships, setFriendships] = useState<Friendship[]>(initialFriendships)
  const [chatFriend, setChatFriend] = useState<FriendUser | null>(null)
  const [challengeFriend, setChallengeFriend] = useState<FriendUser | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<FriendUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const accepted   = friendships.filter((f) => f.status === 'accepted')
  const incoming   = friendships.filter((f) => f.status === 'pending' && f.addressee_id === currentUserId)
  const outgoing   = friendships.filter((f) => f.status === 'pending' && f.requester_id === currentUserId)

  const getFriend  = (f: Friendship): FriendUser =>
    f.requester_id === currentUserId ? f.addressee : f.requester

  async function sendRequest(targetId: string) {
    const res = await fetch('/api/friends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId }) })
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Erreur'); return }
    toast.success('Demande envoyée !')
    setSearchResults((r) => r.filter((u) => u.id !== targetId))
  }

  async function acceptFriend(id: string) {
    await fetch(`/api/friends/${id}/accept`, { method: 'POST' })
    setFriendships((prev) => prev.map((f) => f.id === id ? { ...f, status: 'accepted' } : f))
  }

  async function declineFriend(id: string) {
    await fetch(`/api/friends/${id}/decline`, { method: 'POST' })
    setFriendships((prev) => prev.filter((f) => f.id !== id))
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = searchQ.trim()
      if (q.length < 2) { setSearchResults([]); return }
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        const data = await res.json() as { users: FriendUser[] }
        // Filter out existing friends
        const friendIds = new Set(friendships.map((f) => getFriend(f)?.id))
        setSearchResults((data.users ?? []).filter((u) => !friendIds.has(u.id)))
      } finally { setSearchLoading(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [searchQ, friendships]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto pb-28">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>AMIS</h1>
        <p className="text-gray-500 text-sm">{accepted.length} ami{accepted.length !== 1 ? 's' : ''}{incoming.length > 0 ? ` · ${incoming.length} demande${incoming.length > 1 ? 's' : ''}` : ''}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-xl p-1 mb-5">
        {([['friends', 'Amis'], ['requests', `Demandes${incoming.length > 0 ? ` (${incoming.length})` : ''}`], ['search', 'Chercher']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${tab === t ? 'bg-[#F5C518] text-black' : 'text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Friends tab */}
      {tab === 'friends' && (
        <div className="space-y-2">
          {accepted.length === 0 && (
            <div className="text-center py-12">
              <UserPlus size={40} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Aucun ami pour l'instant</p>
              <button onClick={() => setTab('search')} className="text-[#F5C518] text-sm font-bold mt-2">Chercher des joueurs</button>
            </div>
          )}
          {accepted.map((f) => {
            const friend = getFriend(f)
            if (!friend) return null
            const online = isOnline(friend.last_seen_at)
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5C518] to-[#00D4FF] flex items-center justify-center text-black font-black text-sm overflow-hidden">
                    {friend.photo_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={friend.photo_url} alt={friend.pseudo} className="w-full h-full object-cover" />
                      : friend.pseudo.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#091524] ${online ? 'bg-green-400' : 'bg-gray-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{flag(friend.nation)} {friend.pseudo}</p>
                  <p className="text-gray-600 text-xs">{online ? 'En ligne' : 'Hors ligne'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setChatFriend(friend)}
                    className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <MessageSquare size={15} />
                  </button>
                  <button onClick={() => setChallengeFriend(friend)}
                    className="w-9 h-9 rounded-xl bg-[#F5C518]/10 flex items-center justify-center text-[#F5C518] hover:bg-[#F5C518]/20 transition-colors">
                    <Swords size={15} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {incoming.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Reçues</p>
              <div className="space-y-2">
                {incoming.map((f) => {
                  const requester = f.requester as FriendUser
                  return (
                    <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="glass rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5C518] to-[#00D4FF] flex items-center justify-center text-black font-black text-sm overflow-hidden">
                        {requester?.photo_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={requester.photo_url} alt={requester.pseudo} className="w-full h-full object-cover" />
                          : requester?.pseudo?.slice(0, 2)?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{flag(requester?.nation ?? '')} {requester?.pseudo}</p>
                        <p className="text-gray-600 text-xs">veut être ton ami</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptFriend(f.id)} className="w-9 h-9 rounded-xl bg-green-500/15 text-green-400 flex items-center justify-center hover:bg-green-500/25 transition-colors">
                          <Check size={15} />
                        </button>
                        <button onClick={() => declineFriend(f.id)} className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                          <X size={15} />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Envoyées</p>
              <div className="space-y-2">
                {outgoing.map((f) => {
                  const addressee = f.addressee as FriendUser
                  return (
                    <div key={f.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 font-black text-sm">
                        {addressee?.pseudo?.slice(0, 2)?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{flag(addressee?.nation ?? '')} {addressee?.pseudo}</p>
                      </div>
                      <span className="text-xs text-gray-600 flex items-center gap-1"><Clock size={10} /> En attente</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {incoming.length === 0 && outgoing.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune demande en attente</p>
            </div>
          )}
        </div>
      )}

      {/* Search tab */}
      {tab === 'search' && (
        <div>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Chercher par pseudo…"
              className="w-full glass rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-[#F5C518]/30"
            />
          </div>
          {searchLoading && <div className="text-center text-gray-500 py-4">Recherche…</div>}
          <div className="space-y-2">
            {searchResults.map((u) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5C518] to-[#00D4FF] flex items-center justify-center text-black font-black text-sm overflow-hidden">
                  {u.photo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={u.photo_url} alt={u.pseudo} className="w-full h-full object-cover" />
                    : u.pseudo.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{flag(u.nation)} {u.pseudo}</p>
                </div>
                <button onClick={() => sendRequest(u.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5C518]/10 text-[#F5C518] rounded-xl text-xs font-bold hover:bg-[#F5C518]/20 transition-colors">
                  <UserPlus size={12} /> Ajouter
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Chat modal */}
      <AnimatePresence>
        {chatFriend && (
          <ChatModal friend={chatFriend} currentUserId={currentUserId} onClose={() => setChatFriend(null)} />
        )}
      </AnimatePresence>

      {/* Challenge modal */}
      <AnimatePresence>
        {challengeFriend && (
          <ChallengeModal friend={challengeFriend} onClose={() => setChallengeFriend(null)} router={router} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── ChatModal ─────────────────────────────────────────────────────────────────

function ChatModal({ friend, currentUserId, onClose }: { friend: FriendUser; currentUserId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/friends/${friend.id}/messages`)
    if (!res.ok) return
    const data = await res.json() as { messages: Message[] }
    setMessages(data.messages ?? [])
  }, [friend.id])

  useEffect(() => { loadMessages() }, [loadMessages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(t: string) {
    const trimmed = t.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/friends/${friend.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: trimmed }),
      })
      if (!res.ok) return
      setText('')
      await loadMessages()
    } finally { setSending(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-sm glass-elevated rounded-t-3xl sm:rounded-2xl flex flex-col"
        style={{ maxHeight: '85vh', paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
            <ChevronLeft size={16} />
          </button>
          <p className="text-white font-bold">{flag(friend.nation)} {friend.pseudo}</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {messages.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-8">Commencez à discuter !</p>
          )}
          {messages.map((m) => {
            const isMe = m.sender_id === currentUserId
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-[#F5C518] text-black font-semibold rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm'}`}>
                  {m.text}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Quick messages */}
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto">
          {QUICK_MSGS.map((q) => (
            <button key={q} onClick={() => send(q)}
              className="flex-shrink-0 text-[11px] px-2.5 py-1 bg-white/5 rounded-full text-gray-300 hover:bg-white/10 transition-colors whitespace-nowrap">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 px-4 pt-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(text)}
            placeholder="Message…"
            maxLength={200}
            className="flex-1 glass rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-[#F5C518]/30"
          />
          <button onClick={() => send(text)} disabled={!text.trim() || sending}
            className="w-10 h-10 bg-[#F5C518] disabled:opacity-30 rounded-xl flex items-center justify-center text-black">
            <Send size={16} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── ChallengeModal ─────────────────────────────────────────────────────────────

function ChallengeModal({ friend, onClose, router }: { friend: FriendUser; onClose: () => void; router: ReturnType<typeof useRouter> }) {
  const [stake, setStake] = useState(1)
  const [loading, setLoading] = useState(false)

  async function challenge() {
    setLoading(true)
    try {
      const res = await fetch(`/api/friends/${friend.id}/challenge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stakeCount: stake }),
      })
      const data = await res.json() as { duelId?: string; error?: string }
      if (!res.ok || !data.duelId) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Défi envoyé ! ⚔️')
      router.push(`/battles/duel/${data.duelId}`)
    } catch { toast.error('Erreur réseau') }
    finally { setLoading(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-sm glass-elevated rounded-t-3xl sm:rounded-2xl p-6"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5 sm:hidden" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#C8102E]/10 flex items-center justify-center">
            <Shield size={24} className="text-[#C8102E]" />
          </div>
          <div>
            <p className="text-white font-black text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>DÉFIER</p>
            <p className="text-gray-400 text-sm">{flag(friend.nation)} {friend.pseudo}</p>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-3">Mise : combien de cartes ?</p>
        <div className="flex gap-3 mb-6">
          {[1, 2, 3].map((n) => (
            <button key={n} onClick={() => setStake(n)}
              className={`flex-1 py-3 rounded-xl text-lg font-black transition-all ${stake === n ? 'bg-[#F5C518] text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {n}
            </button>
          ))}
        </div>

        <p className="text-center text-gray-500 text-xs mb-4">
          Le gagnant choisira {stake} carte{stake > 1 ? 's' : ''} parmi les {stake * 6} cartes jouées
        </p>

        <button onClick={challenge} disabled={loading}
          className="w-full bg-[#F5C518] disabled:opacity-50 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {loading
            ? <><div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" /> Envoi…</>
            : <><Swords size={18} /> ENVOYER LE DÉFI</>
          }
        </button>
      </motion.div>
    </motion.div>
  )
}
