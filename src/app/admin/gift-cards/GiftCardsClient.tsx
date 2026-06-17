'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Send, Gift, User, Layers, CheckCircle, Trash2 } from 'lucide-react'
import Image from 'next/image'
import toast from 'react-hot-toast'

interface UserResult {
  id: string; pseudo: string; nation: string; photo_url: string | null
}
interface CardResult {
  id: string; name: string; rarity: string; image_url: string | null; nation: string | null; type: string
}

const RARITY_COLOR: Record<string, string> = {
  Legend: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  Epic:   'text-purple-400 bg-purple-500/15 border-purple-500/30',
  Rare:   'text-blue-400 bg-blue-500/15 border-blue-500/30',
  Common: 'text-white/50 bg-white/5 border-white/10',
}
const RARITY_DOT: Record<string, string> = {
  Legend: 'bg-yellow-400', Epic: 'bg-purple-400', Rare: 'bg-blue-400', Common: 'bg-white/30',
}
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
  // ── User search ─────────────────────────────────────────────────────────────
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const debouncedUser = useDebounce(userQuery, 300)

  // ── Card search ──────────────────────────────────────────────────────────────
  const [cardQuery, setCardQuery] = useState('')
  const [cardResults, setCardResults] = useState<CardResult[]>([])
  const [selectedCards, setSelectedCards] = useState<CardResult[]>([])
  const [cardLoading, setCardLoading] = useState(false)
  const debouncedCard = useDebounce(cardQuery, 300)

  // ── Gift ─────────────────────────────────────────────────────────────────────
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [lastGift, setLastGift] = useState<{ pseudo: string; count: number } | null>(null)

  // ── Search users ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedUser || selectedUser) { setUserResults([]); return }
    setUserLoading(true)
    fetch(`/api/admin/gift-cards?type=users&q=${encodeURIComponent(debouncedUser)}`)
      .then((r) => r.json())
      .then((d) => setUserResults(d))
      .catch(() => {})
      .finally(() => setUserLoading(false))
  }, [debouncedUser, selectedUser])

  // ── Search cards ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setCardLoading(true)
    fetch(`/api/admin/gift-cards?type=cards&q=${encodeURIComponent(debouncedCard)}`)
      .then((r) => r.json())
      .then((d) => setCardResults(d))
      .catch(() => {})
      .finally(() => setCardLoading(false))
  }, [debouncedCard])

  function toggleCard(card: CardResult) {
    setSelectedCards((s) => {
      if (s.find((c) => c.id === card.id)) return s.filter((c) => c.id !== card.id)
      if (s.length >= 20) { toast.error('Maximum 20 cartes'); return s }
      return [...s, card]
    })
  }

  async function send() {
    if (!selectedUser || selectedCards.length === 0) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          cardIds: selectedCards.map((c) => c.id),
          reason: reason || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success(`${selectedCards.length} carte${selectedCards.length > 1 ? 's' : ''} envoyée${selectedCards.length > 1 ? 's' : ''} à ${selectedUser.pseudo} !`)
      setLastGift({ pseudo: selectedUser.pseudo, count: selectedCards.length })
      setSelectedCards([])
      setReason('')
    } catch { toast.error('Erreur réseau') }
    finally { setSending(false) }
  }

  const canSend = !!selectedUser && selectedCards.length > 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Administration</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/15 flex items-center justify-center">
            <Gift size={20} className="text-pink-400" />
          </div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            ENVOYER DES CARTES
          </h1>
        </div>
        <p className="text-white/30 text-sm mt-1 ml-0.5">Offre des cartes directement dans la collection d&apos;un joueur</p>
      </div>

      {/* Last gift confirmation */}
      <AnimatePresence>
        {lastGift && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-500/25 bg-green-500/8">
            <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm">
              <span className="font-bold">{lastGift.count} carte{lastGift.count > 1 ? 's' : ''}</span> envoyée{lastGift.count > 1 ? 's' : ''} à <span className="font-bold">{lastGift.pseudo}</span> avec succès
            </p>
            <button onClick={() => setLastGift(null)} className="ml-auto text-white/20 hover:text-white/50">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: User + Config ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* User picker */}
          <div className="glass rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <User size={15} className="text-blue-400" />
              <p className="text-white font-bold text-sm">Destinataire</p>
            </div>

            {selectedUser ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300 flex-shrink-0">
                  {selectedUser.pseudo[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{selectedUser.pseudo}</p>
                  <p className="text-white/30 text-xs">{flag(selectedUser.nation)} {selectedUser.nation}</p>
                </div>
                <button onClick={() => { setSelectedUser(null); setUserQuery('') }}
                  className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/3 focus-within:border-blue-500/50 transition-colors">
                  <Search size={14} className="text-white/30 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Chercher un joueur par pseudo…"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/20"
                  />
                  {userLoading && <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0" />}
                </div>

                <AnimatePresence>
                  {userResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-white/10 overflow-hidden z-10"
                      style={{ background: '#111827' }}>
                      {userResults.map((u) => (
                        <button key={u.id} onClick={() => { setSelectedUser(u); setUserQuery('') }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                          <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0">
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

          {/* Selected cards */}
          <div className="glass rounded-2xl border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-pink-400" />
                <p className="text-white font-bold text-sm">Cartes sélectionnées</p>
              </div>
              {selectedCards.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 font-bold">
                  {selectedCards.length}/20
                </span>
              )}
            </div>

            {selectedCards.length === 0 ? (
              <p className="text-white/20 text-sm text-center py-6">Aucune carte sélectionnée</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedCards.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/5">
                    {c.image_url ? (
                      <Image src={c.image_url} alt={c.name} width={32} height={44} className="rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-11 rounded bg-white/5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${RARITY_DOT[c.rarity] ?? 'bg-white/30'}`} />
                        <span className="text-white/30 text-xs">{c.rarity} · {flag(c.nation)}</span>
                      </div>
                    </div>
                    <button onClick={() => toggleCard(c)} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reason + Send */}
          <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Raison (optionnel)</label>
              <input
                type="text"
                placeholder="ex: Compensation bug, Récompense tournoi…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={100}
                className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/3 text-white text-sm outline-none placeholder-white/20 focus:border-white/20 transition-colors"
              />
            </div>

            <motion.button
              whileTap={{ scale: canSend ? 0.97 : 1 }}
              onClick={send}
              disabled={!canSend || sending}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-lg disabled:opacity-30 transition-opacity"
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                background: canSend ? 'linear-gradient(135deg, #ec4899, #a855f7)' : 'rgba(255,255,255,0.05)',
                color: canSend ? '#fff' : 'rgba(255,255,255,0.3)',
              }}
            >
              {sending ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ENVOI…</>
              ) : (
                <><Send size={18} /> ENVOYER {selectedCards.length > 0 ? `${selectedCards.length} CARTE${selectedCards.length > 1 ? 'S' : ''}` : 'LES CARTES'}</>
              )}
            </motion.button>
          </div>
        </div>

        {/* ── Right: Card browser ─────────────────────────────────────────────── */}
        <div className="glass rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={15} className="text-pink-400" />
            <p className="text-white font-bold text-sm">Catalogue de cartes</p>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/3 focus-within:border-pink-500/50 mb-4 transition-colors">
            <Search size={14} className="text-white/30 flex-shrink-0" />
            <input
              type="text"
              placeholder="Chercher une carte par nom…"
              value={cardQuery}
              onChange={(e) => setCardQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/20"
            />
            {cardLoading && <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0" />}
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {cardResults.map((c) => {
              const isSelected = !!selectedCards.find((s) => s.id === c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCard(c)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'border-pink-500/40 bg-pink-500/10'
                      : 'border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  {c.image_url ? (
                    <Image src={c.image_url} alt={c.name} width={32} height={44} className="rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-11 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Layers size={12} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-pink-300' : 'text-white'}`}>{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${RARITY_DOT[c.rarity] ?? 'bg-white/30'}`} />
                      <span className="text-white/30 text-xs">{c.rarity}</span>
                      <span className="text-white/15 text-xs">·</span>
                      <span className="text-white/30 text-xs">{flag(c.nation)} {c.nation ?? 'Monde'}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ${RARITY_COLOR[c.rarity] ?? RARITY_COLOR.Common}`}>
                    {c.rarity}
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 10 8" fill="white" className="w-2.5 h-2"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  )}
                </button>
              )
            })}
            {cardResults.length === 0 && !cardLoading && (
              <p className="text-white/20 text-sm text-center py-8">Aucune carte trouvée</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
