'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Send, Gift, CheckCircle, ChevronDown, History, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

interface UserResult {
  id: string; pseudo: string; nation: string; photo_url: string | null
}
interface CardResult {
  id: string; name: string; rarity: string; image_url: string | null; nation: string | null; type: string
}
interface GiftRecord {
  id: string
  recipient: { id: string; pseudo: string; nation: string }
  admin: { id: string; pseudo: string; nation: string }
  cards: { id: string; name: string; rarity: string }[]
  reason: string | null
  created_at: string
}

const RARITY_STYLE: Record<string, { border: string; glow: string; badge: string; dot: string }> = {
  Legend: { border: 'border-yellow-500/40', glow: 'shadow-yellow-500/20', badge: 'bg-yellow-500/15 text-yellow-400', dot: 'bg-yellow-400' },
  Epic:   { border: 'border-purple-500/40', glow: 'shadow-purple-500/20', badge: 'bg-purple-500/15 text-purple-400', dot: 'bg-purple-400' },
  Rare:   { border: 'border-blue-500/40',   glow: 'shadow-blue-500/20',   badge: 'bg-blue-500/15 text-blue-400',   dot: 'bg-blue-400' },
  Common: { border: 'border-white/10',       glow: '',                     badge: 'bg-white/8 text-white/40',       dot: 'bg-white/30' },
}
const RARITY_ORDER = ['Legend', 'Epic', 'Rare', 'Common']

const NATION_FLAGS: Record<string, string> = {
  France:'🇫🇷',Brazil:'🇧🇷',Argentina:'🇦🇷',England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',Spain:'🇪🇸',Germany:'🇩🇪',
  Portugal:'🇵🇹',Netherlands:'🇳🇱',Morocco:'🇲🇦',USA:'🇺🇸',Mexico:'🇲🇽',Belgium:'🇧🇪',
}
const flag = (n: string | null) => n ? (NATION_FLAGS[n] ?? '🌍') : '🌍'

function useDebounce<T>(value: T, delay = 300): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return deb
}

export function GiftCardsClient() {
  const [history, setHistory] = useState<GiftRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/admin/gift-cards?type=history')
      if (res.ok) setHistory(await res.json())
    } finally { setHistoryLoading(false) }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const [cardQuery, setCardQuery] = useState('')
  const [cardResults, setCardResults] = useState<CardResult[]>([])
  const [selectedCards, setSelectedCards] = useState<CardResult[]>([])
  const [cardLoading, setCardLoading] = useState(false)
  const [rarityFilter, setRarityFilter] = useState<string>('all')

  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const debouncedUser = useDebounce(userQuery, 300)
  const debouncedCard = useDebounce(cardQuery, 300)

  useEffect(() => {
    if (!debouncedUser || selectedUser) { setUserResults([]); return }
    setUserLoading(true)
    fetch(`/api/admin/gift-cards?type=users&q=${encodeURIComponent(debouncedUser)}`)
      .then(r => r.json()).then(d => { setUserResults(d); setShowUserDropdown(true) })
      .catch(() => {}).finally(() => setUserLoading(false))
  }, [debouncedUser, selectedUser])

  useEffect(() => {
    setCardLoading(true)
    fetch(`/api/admin/gift-cards?type=cards&q=${encodeURIComponent(debouncedCard)}`)
      .then(r => r.json()).then(d => setCardResults(d))
      .catch(() => {}).finally(() => setCardLoading(false))
  }, [debouncedCard])

  function toggleCard(card: CardResult) {
    setSelectedCards(s => {
      if (s.find(c => c.id === card.id)) return s.filter(c => c.id !== card.id)
      if (s.length >= 20) { toast.error('Maximum 20 cartes'); return s }
      return [...s, card]
    })
    setSent(false)
  }

  async function send() {
    if (!selectedUser || selectedCards.length === 0) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, cardIds: selectedCards.map(c => c.id), reason: reason || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setSent(true)
      toast.success(`${selectedCards.length} carte${selectedCards.length > 1 ? 's' : ''} envoyée${selectedCards.length > 1 ? 's' : ''} à ${selectedUser.pseudo} !`)
      setSelectedCards([])
      setReason('')
      loadHistory()
    } catch { toast.error('Erreur réseau') }
    finally { setSending(false) }
  }

  const canSend = !!selectedUser && selectedCards.length > 0
  const filteredResults = rarityFilter === 'all' ? cardResults : cardResults.filter(c => c.rarity === rarityFilter)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
            <Gift size={20} className="text-pink-400" />
          </div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            ENVOYER DES CARTES
          </h1>
        </div>
        <p className="text-white/30 text-sm mt-1">
          Offre des cartes directement dans la collection d&apos;un joueur
        </p>
      </div>

      {/* Step 1 — joueur */}
      <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-black">1</span>
          <p className="text-white font-bold">Choisir un joueur</p>
        </div>

        {selectedUser ? (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/8 border border-blue-500/20">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center text-lg font-black text-blue-300 flex-shrink-0">
              {selectedUser.pseudo[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold">{selectedUser.pseudo}</p>
              <p className="text-white/40 text-sm">{flag(selectedUser.nation)} {selectedUser.nation}</p>
            </div>
            <button
              onClick={() => { setSelectedUser(null); setUserQuery(''); setSent(false) }}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/3 focus-within:border-blue-500/40 transition-colors">
              <Search size={15} className="text-white/30 flex-shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un joueur par pseudo…"
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/20"
              />
              {userLoading && <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0" />}
            </div>

            <AnimatePresence>
              {showUserDropdown && userResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/8 overflow-hidden z-20"
                  style={{ background: '#0f172a' }}
                >
                  {userResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setUserQuery(''); setShowUserDropdown(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/4 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300 flex-shrink-0">
                        {u.pseudo[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{u.pseudo}</p>
                        <p className="text-white/30 text-xs">{flag(u.nation)} {u.nation}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Step 2 — cartes */}
      <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 text-xs font-black">2</span>
            <p className="text-white font-bold">Sélectionner les cartes</p>
          </div>
          {selectedCards.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-400 font-bold border border-pink-500/20">
              {selectedCards.length} / 20
            </span>
          )}
        </div>

        {/* Barre recherche + filtre */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 bg-white/3 focus-within:border-pink-500/40 transition-colors">
            <Search size={14} className="text-white/30 flex-shrink-0" />
            <input
              type="text"
              placeholder="Chercher par nom…"
              value={cardQuery}
              onChange={e => setCardQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/20"
            />
            {cardLoading && <div className="w-3.5 h-3.5 border border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0" />}
          </div>

          <div className="relative flex items-center">
            <select
              value={rarityFilter}
              onChange={e => setRarityFilter(e.target.value)}
              className="h-full px-4 pr-8 rounded-xl border border-white/10 bg-white/3 text-white/60 text-sm outline-none cursor-pointer appearance-none"
            >
              <option value="all">Toutes</option>
              {RARITY_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 text-white/30 pointer-events-none" />
          </div>
        </div>

        {/* Grille de cartes */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto pr-1">
          {filteredResults.map(c => {
            const sel = !!selectedCards.find(s => s.id === c.id)
            const rs = RARITY_STYLE[c.rarity] ?? RARITY_STYLE.Common
            return (
              <button
                key={c.id}
                onClick={() => toggleCard(c)}
                className={`relative flex flex-col rounded-xl border transition-all duration-150 overflow-hidden ${
                  sel ? `${rs.border} shadow-lg ${rs.glow} scale-[0.96]` : 'border-white/8 hover:border-white/20'
                }`}
              >
                <div className="aspect-[3/4] w-full relative bg-white/5">
                  {c.image_url ? (
                    <Image src={c.image_url} alt={c.name} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xl">{flag(c.nation)}</div>
                  )}
                  {sel && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center">
                        <svg viewBox="0 0 10 8" className="w-3.5 h-3">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-1.5 bg-black/20">
                  <p className="text-white text-[10px] font-bold truncate leading-tight">{c.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rs.dot}`} />
                    <span className="text-white/30 text-[9px]">{c.rarity}</span>
                  </div>
                </div>
              </button>
            )
          })}

          {filteredResults.length === 0 && !cardLoading && (
            <div className="col-span-full py-12 text-center">
              <p className="text-white/20 text-sm">Aucune carte trouvée</p>
            </div>
          )}
        </div>

        {/* Chips des cartes sélectionnées */}
        {selectedCards.length > 0 && (
          <div className="pt-3 border-t border-white/5">
            <p className="text-white/30 text-xs mb-2">Cartes sélectionnées :</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedCards.map(c => {
                const rs = RARITY_STYLE[c.rarity] ?? RARITY_STYLE.Common
                return (
                  <span key={c.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${rs.badge} ${rs.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rs.dot}`} />
                    {c.name}
                    <button onClick={() => toggleCard(c)} className="ml-0.5 opacity-50 hover:opacity-100">
                      <X size={10} />
                    </button>
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Step 3 — envoi */}
      <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-black">3</span>
          <p className="text-white font-bold">Confirmer l&apos;envoi</p>
        </div>

        <input
          type="text"
          placeholder="Raison (optionnel) — ex: compensation bug, récompense tournoi…"
          value={reason}
          onChange={e => setReason(e.target.value)}
          maxLength={100}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/3 text-white text-sm outline-none placeholder-white/20 focus:border-white/20 transition-colors"
        />

        {/* Récapitulatif */}
        {(selectedUser || selectedCards.length > 0) && (
          <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/5 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-white/40">Destinataire</span>
              <span className={`font-semibold ${selectedUser ? 'text-white' : 'text-white/20'}`}>
                {selectedUser ? `${flag(selectedUser.nation)} ${selectedUser.pseudo}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Cartes</span>
              <span className={`font-semibold ${selectedCards.length > 0 ? 'text-pink-400' : 'text-white/20'}`}>
                {selectedCards.length > 0 ? `${selectedCards.length} carte${selectedCards.length > 1 ? 's' : ''}` : '—'}
              </span>
            </div>
            {reason && (
              <div className="flex justify-between gap-4">
                <span className="text-white/40">Raison</span>
                <span className="text-white/60 text-xs text-right truncate">{reason}</span>
              </div>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold">
              <CheckCircle size={18} />
              Envoyé avec succès !
            </motion.div>
          ) : (
            <motion.button
              key="send"
              whileTap={{ scale: canSend ? 0.98 : 1 }}
              onClick={send}
              disabled={!canSend || sending}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-xl disabled:opacity-25 transition-all"
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                background: canSend ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' : 'rgba(255,255,255,0.04)',
                color: canSend ? '#fff' : 'rgba(255,255,255,0.2)',
                boxShadow: canSend ? '0 0 30px rgba(236,72,153,0.25)' : 'none',
              }}
            >
              {sending
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ENVOI EN COURS…</>
                : <><Send size={18} /> ENVOYER {selectedCards.length > 0 ? `${selectedCards.length} CARTE${selectedCards.length > 1 ? 'S' : ''}` : 'LES CARTES'}</>
              }
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Section historique */}
      <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              <History size={13} />
            </div>
            <p className="text-white font-bold">Historique des envois</p>
          </div>
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {historyLoading && history.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-white/20 text-sm py-8">Aucun envoi pour l&apos;instant</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((g) => (
              <div key={g.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/20 flex items-center justify-center text-xs font-bold text-pink-300 flex-shrink-0 mt-0.5">
                  {g.recipient.pseudo[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-semibold">{flag(g.recipient.nation)} {g.recipient.pseudo}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 font-medium border border-pink-500/15">
                      {g.cards.length} carte{g.cards.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {g.cards.map((c) => {
                      const color = c.rarity === 'Legend' ? '#F5C518' : c.rarity === 'Epic' ? '#A855F7' : c.rarity === 'Rare' ? '#00D4FF' : '#9CA3AF'
                      return (
                        <span
                          key={c.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                          style={{ borderColor: `${color}40`, color, background: 'rgba(255,255,255,0.04)' }}
                        >
                          {c.name}
                        </span>
                      )
                    })}
                  </div>
                  {g.reason && <p className="text-white/30 text-xs mt-1 italic">{g.reason}</p>}
                </div>
                <span className="text-white/20 text-[10px] whitespace-nowrap flex-shrink-0 mt-0.5">
                  {new Date(g.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  {' '}
                  {new Date(g.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
