'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Clock, Check, Share2, RotateCcw, Zap, Shield, Trophy, TrendingDown, Minus, ArrowDownRight, Star, Gift, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GameCard } from '@/components/ui/Card'
import { computePower } from '@/lib/duel-engine'
import { RARITY_COLORS } from '@/types'
import toast from 'react-hot-toast'
import type { Card } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile { id: string | null; pseudo: string; nation: string; photo_url: string | null }
interface DuelEvent {
  minute: number; timeMs: number
  team: 'challenger' | 'opponent'
  playerName: string
  cardImageUrl: string | null
  cardRarity: string
  type: 'goal' | 'chance' | 'save'
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Duel = Record<string, any>

interface Props {
  initialDuel: Duel
  currentUserId: string
  myCards: Card[]
}

const RARITY_ORDER: Record<string, number> = { Legend: 4, Epic: 3, Rare: 2, Common: 1 }
const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪',
  Japan: '🇯🇵', Senegal: '🇸🇳', Croatia: '🇭🇷', Uruguay: '🇺🇾',
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DuelClient({ initialDuel, currentUserId, myCards }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [duel, setDuel] = useState<Duel>(initialDuel)
  const [replaying, setReplaying] = useState(false)
  const duelRef = useRef(duel)
  useEffect(() => { duelRef.current = duel }, [duel])

  const [view, setView] = useState<'waiting' | 'picking' | 'animation' | 'stealing' | 'tiebreak' | 'result' | 'cancelled'>(() => {
    if (initialDuel.status === 'cancelled') return 'cancelled'
    if (initialDuel.status === 'finished') return 'result'
    if (initialDuel.status === 'stealing') return 'stealing'
    if (initialDuel.status === 'tiebreak') return 'tiebreak'
    if (initialDuel.status === 'picking') return 'picking'
    return 'waiting'
  })
  const viewRef = useRef(view)
  useEffect(() => { viewRef.current = view }, [view])

  // Cancel open/invited duels when user navigates away (fixes queue bug)
  useEffect(() => {
    return () => {
      const s = duelRef.current.status
      if (s === 'open' || s === 'invited') {
        fetch(`/api/duels/${duelRef.current.id}/cancel`, { method: 'POST' }).catch(() => {})
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isChallenger = duel.challenger_id === currentUserId
  const me    = (isChallenger ? duel.challenger : duel.opponent) as Profile
  const them  = (isChallenger ? duel.opponent  : duel.challenger) as Profile

  const myPicks    = (isChallenger ? duel.challenger_picks : duel.opponent_picks) as Card[] | null
  const theirPicks = (isChallenger ? duel.opponent_picks  : duel.challenger_picks) as Card[] | null

  // Realtime subscription — uses viewRef to avoid stale closure
  useEffect(() => {
    const ch = supabase
      .channel(`duel-${duel.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${duel.id}` },
        ({ new: updated }) => {
          setDuel((prev) => ({ ...prev, ...updated }))
          const s = (updated as Duel).status
          const v = viewRef.current
          if (s === 'cancelled') {
            toast('Match annulé par l\'adversaire', { icon: '❌' })
            setTimeout(() => router.push('/battles'), 1800)
            return
          }
          if (s === 'picking' && v === 'waiting') setView('picking')
          if ((s === 'stealing' || s === 'finished' || s === 'tiebreak') && v === 'picking') {
            const isForfeitWin = s === 'stealing' && (updated as Duel).winner_id === currentUserId && (updated as Duel).challenger_score == null
            if (isForfeitWin) {
              toast('Victoire ! L\'adversaire a abandonné', { icon: '🏆' })
              setView('stealing')
            } else {
              setView('animation')
            }
          }
          if (s === 'tiebreak' && v === 'animation') setView('tiebreak')
          if (s === 'finished' && v === 'stealing') setView('result')
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [duel.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll fallback every 3s
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/duels/${duel.id}/state`)
        if (!r.ok) return
        const data = await r.json() as Duel
        setDuel((prev) => ({ ...prev, ...data }))
        if (data.status === 'cancelled') {
          clearInterval(poll)
          toast('Match annulé', { icon: '❌' })
          setTimeout(() => router.push('/battles'), 1800)
          return
        }
        if (data.status === 'picking'  && view === 'waiting')  setView('picking')
        if ((data.status === 'stealing' || data.status === 'finished' || data.status === 'tiebreak') && view === 'picking') setView('animation')
        if (data.status === 'tiebreak' && view === 'animation') setView('tiebreak')
        if (data.status === 'finished' && view === 'stealing') setView('result')
      } catch { /* réseau */ }
    }, 3000)
    return () => clearInterval(poll)
  }, [duel.id, view]) // eslint-disable-line react-hooks/exhaustive-deps

  // animation → stealing/tiebreak/result after 32s (30s match + 2s buffer)
  useEffect(() => {
    if (view !== 'animation') return
    const t = setTimeout(() => {
      if (duelRef.current.status === 'stealing') setView('stealing')
      else if (duelRef.current.status === 'tiebreak') setView('tiebreak')
      else setView('result')
    }, 32000)
    return () => clearTimeout(t)
  }, [view])

  // Auto-redirect if landing on a cancelled duel
  useEffect(() => {
    if (view === 'cancelled') {
      toast('Ce match a été annulé', { icon: '❌' })
      const t = setTimeout(() => router.push('/battles'), 1800)
      return () => clearTimeout(t)
    }
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Abandon logic ──────────────────────────────────────────────────────────
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [abandonLoading, setAbandonLoading] = useState(false)

  async function handleAbandon() {
    setAbandonLoading(true)
    try {
      await fetch(`/api/duels/${duel.id}/cancel`, { method: 'POST' })
      setView('cancelled')
    } catch {
      toast.error('Erreur réseau')
      setAbandonLoading(false)
      setConfirmAbandon(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07070f]">
      {/* Abandon button — picking & stealing only */}
      {(view === 'picking' || view === 'stealing') && !confirmAbandon && (
        <button
          onClick={() => setConfirmAbandon(true)}
          className="fixed left-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
          style={{ top: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))' }}
        >
          <LogOut size={12} /> Abandonner
        </button>
      )}

      {/* Abandon confirmation modal */}
      <AnimatePresence>
        {confirmAbandon && (
          <motion.div
            key="abandon-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => { if (!abandonLoading) setConfirmAbandon(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f0f1a] border border-red-500/30 rounded-2xl p-6 space-y-4 w-full max-w-xs"
            >
              <div className="text-center">
                <p className="text-white font-black text-xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  ABANDONNER LE MATCH ?
                </p>
                <p className="text-white/40 text-sm mt-1">L'adversaire sera averti et redirigé vers les battles</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAbandon(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 font-bold text-sm hover:bg-white/10 transition-colors">
                  Continuer
                </button>
                <button
                  onClick={handleAbandon}
                  disabled={abandonLoading}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-sm disabled:opacity-50 hover:bg-red-600 transition-colors"
                >
                  {abandonLoading ? '…' : 'Abandonner'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'cancelled' && (
          <motion.div key="cancelled" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              MATCH ANNULÉ
            </h2>
            <p className="text-gray-400 text-sm">Redirection vers les duels…</p>
          </motion.div>
        )}
        {view === 'waiting' && (
          <WaitingView key="waiting" duel={duel} currentUserId={currentUserId} onReady={() => setView('picking')} />
        )}
        {view === 'picking' && (
          <PickingView key="picking" duel={duel} currentUserId={currentUserId} myCards={myCards}
            myPicks={myPicks} theirPicks={theirPicks} me={me} them={them}
            onSubmitted={() => { /* wait for status update */ }} />
        )}
        {view === 'animation' && (
          <AnimationView key="animation" duel={duel} isChallenger={isChallenger} me={me} them={them} />
        )}
        {view === 'tiebreak' && (
          <TiebreakView key="tiebreak" duel={duel} />
        )}
        {view === 'stealing' && (
          <StealingView key="stealing" duel={duel} currentUserId={currentUserId} onDone={() => setView('result')} />
        )}
        {view === 'result' && (
          <ResultView key="result" duel={duel} currentUserId={currentUserId} me={me} them={them}
            replayLoading={replaying}
            onReplay={async () => {
              setReplaying(true)
              try {
                const res = await fetch('/api/duels/find', { method: 'POST' })
                const data = await res.json() as { duelId?: string; error?: string }
                if (!res.ok || !data.duelId) {
                  toast.error(data.error ?? 'Erreur matchmaking')
                  setReplaying(false)
                  return
                }
                router.push(`/battles/duel/${data.duelId}`)
              } catch {
                toast.error('Erreur réseau')
                setReplaying(false)
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── WaitingView ───────────────────────────────────────────────────────────────

function WaitingView({ duel, currentUserId, onReady }: { duel: Duel; currentUserId: string; onReady: () => void }) {
  const router = useRouter()
  const [elapsed, setElapsed] = useState(0)
  const botFiredRef = useRef(false)

  const isChallenger = duel.challenger_id === currentUserId

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Bot fallback after 50s
  useEffect(() => {
    if (!isChallenger || botFiredRef.current) return
    if (elapsed < 50) return
    botFiredRef.current = true
    fetch(`/api/duels/${duel.id}/add-bot`, { method: 'POST' })
      .then((r) => r.json())
      .then((d: { success?: boolean }) => { if (d.success) onReady() })
      .catch(() => { botFiredRef.current = false })
  }, [elapsed, isChallenger, duel.id, onReady])

  // Re-poll matchmaking every 4s while waiting as challenger (race condition fix)
  useEffect(() => {
    if (!isChallenger) return
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/duels/find', { method: 'POST' })
        if (!res.ok) return
        const data = await res.json() as { duelId?: string; joined?: boolean }
        if (data.joined && data.duelId && data.duelId !== duel.id) {
          botFiredRef.current = true
          router.replace(`/battles/duel/${data.duelId}`)
        }
      } catch { /* ignore */ }
    }, 4000)
    return () => clearInterval(poll)
  }, [duel.id, isChallenger, router])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 gap-6"
    >
      <div className="relative w-32 h-32">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-[#F5C518]/20"
            animate={{ scale: [1, 3], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, delay: i * 0.7, repeat: Infinity }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/30 flex items-center justify-center">
            <Swords className="text-[#F5C518]" size={32} />
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-4xl font-black text-white mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          RECHERCHE…
        </h2>
        <p className="text-gray-500 text-sm">
          {elapsed < 40 ? 'En attente d\'un adversaire…' : 'Adversaire trouvé !'}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#F5C518] rounded-full"
              animate={{ width: `${Math.min(100, (elapsed / 50) * 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-gray-600 text-xs font-mono">{elapsed}s</span>
        </div>
      </div>

      <button onClick={() => router.push('/battles')} className="text-gray-600 hover:text-gray-400 text-sm transition-colors mt-4">
        Annuler
      </button>
    </motion.div>
  )
}

// ── PickingView ───────────────────────────────────────────────────────────────

function PickingView({
  duel, currentUserId: _currentUserId, myCards, myPicks, theirPicks, me, them, onSubmitted,
}: {
  duel: Duel; currentUserId: string; myCards: Card[]
  myPicks: Card[] | null; theirPicks: Card[] | null
  me: Profile; them: Profile
  onSubmitted: () => void
}) {
  const [selectedField, setSelectedField] = useState<Card[]>([])
  const [selectedGK, setSelectedGK] = useState<Card | null>(null)
  const [selectedCoach, setSelectedCoach] = useState<Card | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(!!myPicks)
  const [timeLeft, setTimeLeft] = useState<number>(45)
  const [tab, setTab] = useState<'field' | 'gk' | 'coach'>('field')

  useEffect(() => {
    if (!duel.picks_deadline) return
    const update = () => {
      const secs = Math.max(0, Math.ceil((new Date(duel.picks_deadline).getTime() - Date.now()) / 1000))
      setTimeLeft(secs)
    }
    update()
    const t = setInterval(update, 500)
    return () => clearInterval(t)
  }, [duel.picks_deadline])

  const isCoachCard = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'COACH'
  const isGKCard    = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'GK'

  const sorted      = useMemo(() => [...myCards].sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0)), [myCards])
  const fieldCards  = useMemo(() => sorted.filter((c) => !isGKCard(c) && !isCoachCard(c)), [sorted])
  const gkCards     = useMemo(() => sorted.filter(isGKCard), [sorted])
  const coachCards  = useMemo(() => sorted.filter(isCoachCard), [sorted])

  // Auto-pick when timer hits 0
  useEffect(() => {
    if (timeLeft > 0 || submitted || myPicks) return
    const autoCoach = coachCards[0] ?? sorted[sorted.length - 1]
    const autoGK    = gkCards[0] ?? sorted.find((c) => c.id !== autoCoach?.id) ?? sorted[1]
    const autoField = fieldCards.filter((c) => c.id !== autoGK?.id && c.id !== autoCoach?.id).slice(0, 4)
    if (autoField.length === 4 && autoGK && autoCoach) {
      submitPicks(autoField, autoGK, autoCoach)
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  const cohesion = useMemo(() => {
    if (selectedField.length === 4 && selectedGK && selectedCoach) {
      return computePower([...selectedField, selectedGK, selectedCoach])
    }
    return null
  }, [selectedField, selectedGK, selectedCoach])

  function toggleField(card: Card) {
    if (selectedField.find((c) => c.id === card.id)) {
      setSelectedField((p) => p.filter((c) => c.id !== card.id))
    } else if (selectedField.length < 4) {
      setSelectedField((p) => [...p, card])
    }
  }

  async function submitPicks(field: Card[], gk: Card, coach: Card) {
    setLoading(true)
    try {
      const res = await fetch(`/api/duels/${duel.id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: field.map((c) => c.id), gkId: gk.id, coachId: coach.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setSubmitted(true)
      onSubmitted()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = selectedField.length === 4 && selectedGK !== null && selectedCoach !== null
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#F5C518'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen px-4 py-4 max-w-2xl mx-auto pb-28"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider">{me?.pseudo} vs {them?.pseudo ?? '…'}</p>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            CHOISIS TON ÉQUIPE
          </h1>
        </div>
        <motion.div
          animate={{ scale: timeLeft <= 10 ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
          className="flex flex-col items-center glass rounded-xl px-4 py-2"
        >
          <Clock size={12} style={{ color: timerColor }} />
          <span className="text-xl font-black font-mono" style={{ color: timerColor, fontFamily: 'Bebas Neue, sans-serif' }}>
            {timeLeft}
          </span>
        </motion.div>
      </div>

      {/* Opponent status */}
      <div className="glass rounded-xl p-3 mb-4 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${theirPicks ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
        <span className="text-sm text-gray-400">
          {theirPicks ? `${them?.pseudo ?? 'Adversaire'} a confirmé son équipe ✓` : `${them?.pseudo ?? 'Adversaire'} sélectionne…`}
        </span>
        {cohesion !== null && (
          <span className="ml-auto text-xs font-black text-[#F5C518]">COHÉSION {cohesion}</span>
        )}
      </div>

      {submitted || myPicks ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-8 text-center">
          <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-white font-bold text-lg">Équipe confirmée !</p>
          <p className="text-gray-500 text-sm mt-1">
            {theirPicks ? 'Simulation en cours…' : `En attente de ${them?.pseudo ?? '…'}`}
          </p>
        </motion.div>
      ) : (
        <>
          {/* 6 selected slots: row 4 field + row GK+Coach */}
          <div className="mb-4">
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`aspect-[2/3] rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${selectedField[i] ? 'border-[#F5C518]/50' : 'border-white/10'}`}>
                  {selectedField[i]
                    ? <GameCard card={selectedField[i]} owned size="sm" />
                    : <span className="text-gray-700 text-[10px]">J{i + 1}</span>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className={`aspect-[2/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all relative ${selectedGK ? 'border-blue-400/50' : 'border-white/10'}`}>
                {selectedGK ? (
                  <>
                    <GameCard card={selectedGK} owned size="sm" />
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[7px] font-black px-1 rounded">GK</div>
                  </>
                ) : <span className="text-gray-700 text-xs">Gardien</span>}
              </div>
              <div className={`aspect-[2/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all relative ${selectedCoach ? 'border-purple-400/50' : 'border-white/10'}`}>
                {selectedCoach ? (
                  <>
                    <GameCard card={selectedCoach} owned size="sm" />
                    <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[7px] font-black px-1 rounded">C</div>
                  </>
                ) : <span className="text-gray-700 text-xs">Coach</span>}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-3 glass rounded-xl p-1">
            {([['field', `Joueurs (${selectedField.length}/4)`], ['gk', `Gardien${selectedGK ? ' ✓' : ''}`], ['coach', `Coach${selectedCoach ? ' ✓' : ''}`]] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${tab === t ? 'bg-[#F5C518] text-black' : 'text-gray-400'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
            {tab === 'field' && fieldCards.map((card) => {
              const sel = !!selectedField.find((c) => c.id === card.id)
              const usedElsewhere = card.id === selectedGK?.id || card.id === selectedCoach?.id
              const disabled = usedElsewhere || (!sel && selectedField.length >= 4)
              return (
                <motion.div key={card.id} whileTap={disabled ? {} : { scale: 0.92 }}
                  className={`rounded-xl ${disabled ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'} ${sel ? 'ring-2 ring-[#F5C518]' : ''}`}
                  onClick={() => !disabled && toggleField(card)}>
                  <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                </motion.div>
              )
            })}

            {tab === 'gk' && (gkCards.length > 0 ? gkCards : sorted.filter(
              (c) => !selectedField.find((f) => f.id === c.id) && c.id !== selectedCoach?.id
            )).map((card) => {
              const sel = selectedGK?.id === card.id
              return (
                <motion.div key={card.id} whileTap={{ scale: 0.92 }}
                  className={`rounded-xl cursor-pointer ${sel ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={() => setSelectedGK(sel ? null : card)}>
                  <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                </motion.div>
              )
            })}

            {tab === 'coach' && (coachCards.length > 0 ? coachCards : sorted.filter(
              (c) => !selectedField.find((f) => f.id === c.id) && c.id !== selectedGK?.id
            )).map((card) => {
              const sel = selectedCoach?.id === card.id
              return (
                <motion.div key={card.id} whileTap={{ scale: 0.92 }}
                  className={`rounded-xl cursor-pointer ${sel ? 'ring-2 ring-purple-400' : ''}`}
                  onClick={() => setSelectedCoach(sel ? null : card)}>
                  <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      {!submitted && !myPicks && (
        <div className="fixed bottom-20 left-0 right-0 px-4 max-w-2xl mx-auto">
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!canSubmit || loading}
            onClick={() => canSubmit && selectedGK && selectedCoach && submitPicks(selectedField, selectedGK, selectedCoach)}
            className="w-full bg-[#F5C518] disabled:opacity-30 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-xl shadow-yellow-500/20"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            {loading ? 'Confirmation…' : 'CONFIRMER MON ÉQUIPE ⚡'}
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

// ── AnimationView ─────────────────────────────────────────────────────────────

const MATCH_MS = 30000

function AnimationView({ duel, isChallenger, me, them }: { duel: Duel; isChallenger: boolean; me: Profile; them: Profile }) {
  const [elapsed, setElapsed] = useState(0)
  const [visibleEvents, setVisibleEvents] = useState<DuelEvent[]>([])
  const [myGoals, setMyGoals] = useState(0)
  const [theirGoals, setTheirGoals] = useState(0)
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 })
  const [cardFlash, setCardFlash] = useState<{ name: string; isMine: boolean; cardImageUrl: string | null; cardRarity: string; type: 'goal' | 'save' } | null>(null)
  const startRef = useRef(Date.now())
  const lastCountRef = useRef(0)

  const events = useMemo(() => {
    const raw = (duel.match_events ?? []) as DuelEvent[]
    const maxMs = raw.length > 0 ? Math.max(...raw.map((e) => e.timeMs)) : 30000
    return raw.map((e) => ({ ...e, timeMs: Math.round((e.timeMs / maxMs) * MATCH_MS) }))
  }, [duel.match_events])

  const flag = (nation: string) => NATION_FLAGS[nation] ?? '🌍'
  const progress = Math.min(100, (elapsed / MATCH_MS) * 100)
  const displayMinute = Math.min(90, Math.floor((elapsed / MATCH_MS) * 90))
  const isFinished = elapsed >= MATCH_MS

  useEffect(() => {
    const frame = setInterval(() => {
      const now = Date.now() - startRef.current
      setElapsed(now)

      const vis = events.filter((e) => e.timeMs <= now)
      const newCount = vis.length

      if (newCount > lastCountRef.current) {
        const newEvs = vis.slice(lastCountRef.current)
        for (const ev of newEvs) {
          const isMine = (isChallenger && ev.team === 'challenger') || (!isChallenger && ev.team === 'opponent')
          const tx = ev.team === 'challenger'
            ? (ev.type === 'goal' ? 88 : 72)
            : (ev.type === 'goal' ? 12 : 28)
          const ty = 35 + Math.random() * 30
          setBallPos({ x: tx, y: ty })

          if (ev.type === 'goal' || ev.type === 'save') {
            setCardFlash({ name: ev.playerName, isMine, cardImageUrl: ev.cardImageUrl ?? null, cardRarity: ev.cardRarity ?? 'Common', type: ev.type })
            setTimeout(() => setCardFlash(null), 2500)
            setTimeout(() => setBallPos({ x: 50, y: 50 }), 2700)
          } else {
            setTimeout(() => setBallPos({ x: 50, y: 50 }), 1600)
          }
        }
        lastCountRef.current = newCount
      }

      setVisibleEvents(vis)
      const cG = vis.filter((e) => e.type === 'goal' && e.team === 'challenger').length
      const oG = vis.filter((e) => e.type === 'goal' && e.team === 'opponent').length
      setMyGoals(isChallenger ? cG : oG)
      setTheirGoals(isChallenger ? oG : cG)
    }, 80)
    return () => clearInterval(frame)
  }, [events, isChallenger])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col px-4 py-5 max-w-lg mx-auto"
    >
      {/* Scoreboard */}
      <div className="glass rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 text-center">
            <p className="text-3xl leading-none">{flag(me?.nation)}</p>
            <p className="text-white font-black text-xs mt-1 truncate">{me?.pseudo}</p>
          </div>
          <div className="text-center px-2 min-w-[100px]">
            <motion.div
              key={`${myGoals}-${theirGoals}`}
              initial={{ scale: 1.4, color: '#F5C518' }}
              animate={{ scale: 1, color: '#ffffff' }}
              transition={{ duration: 0.35 }}
              className="text-5xl font-black"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {myGoals} — {theirGoals}
            </motion.div>
            <div className="flex items-center gap-1.5 justify-center mt-1">
              {!isFinished && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              <span className="text-gray-500 text-xs font-mono">{isFinished ? 'FT' : `${displayMinute}'`}</span>
            </div>
          </div>
          <div className="flex-1 text-center">
            <p className="text-3xl leading-none">{flag(them?.nation)}</p>
            <p className="text-white font-black text-xs mt-1 truncate">{them?.pseudo}</p>
          </div>
        </div>
        <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div className="h-full bg-[#F5C518] rounded-full" style={{ width: `${progress}%` }} transition={{ duration: 0.08 }} />
        </div>
      </div>

      {/* Pitch */}
      <MatchPitch ballPos={ballPos} challengerPseudo={isChallenger ? me?.pseudo : them?.pseudo} opponentPseudo={isChallenger ? them?.pseudo : me?.pseudo} />

      {/* Events feed */}
      <div className="flex-1 mt-4 space-y-1.5 overflow-hidden">
        <AnimatePresence initial={false}>
          {[...visibleEvents].reverse().slice(0, 5).map((ev, i) => {
            const isMine = (isChallenger && ev.team === 'challenger') || (!isChallenger && ev.team === 'opponent')
            const remMin = Math.min(90, Math.round((ev.timeMs / MATCH_MS) * 90))
            return (
              <motion.div
                key={`${ev.minute}-${ev.type}-${ev.playerName}`}
                initial={{ opacity: 0, x: isMine ? -20 : 20, height: 0 }}
                animate={{ opacity: 1 - i * 0.18, x: 0, height: 'auto' }}
                transition={{ duration: 0.25 }}
                className={`rounded-xl px-3 py-2 flex items-center gap-3 border ${
                  ev.type === 'goal'
                    ? isMine ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <span className="text-base flex-shrink-0">
                  {ev.type === 'goal' ? '⚽' : ev.type === 'chance' ? '🎯' : '🧤'}
                </span>
                <p className={`text-sm font-bold flex-1 truncate ${ev.type === 'goal' ? (isMine ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}`}>
                  {ev.type === 'goal' ? 'BUT !' : ev.type === 'chance' ? 'Occasion' : 'Arrêt !'}{' '}
                  <span className="font-normal">{ev.playerName}</span>
                </p>
                <span className="text-xs font-mono text-gray-600 flex-shrink-0">{remMin}&apos;</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isFinished && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-5">
            <p className="text-[#F5C518] font-black text-3xl tracking-wider" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              COUP DE SIFFLET FINAL !
            </p>
            <p className="text-gray-500 text-sm mt-1">Résultats dans un instant…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card flash overlay (goal/save) */}
      <AnimatePresence>
        {cardFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className={`absolute inset-0 ${cardFlash.type === 'goal' ? (cardFlash.isMine ? 'bg-green-500/10' : 'bg-red-500/10') : 'bg-blue-500/10'}`} />
            <motion.div
              initial={{ scale: 0.4, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, y: -30 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className="relative text-center z-10 flex flex-col items-center gap-3"
            >
              {/* Card image with glow */}
              {cardFlash.cardImageUrl && (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-28 h-40 rounded-xl overflow-hidden border-2"
                  style={{
                    borderColor: RARITY_COLORS[cardFlash.cardRarity as keyof typeof RARITY_COLORS] ?? '#fff',
                    boxShadow: `0 0 40px ${rarityGlow(cardFlash.cardRarity)}, 0 0 80px ${rarityGlow(cardFlash.cardRarity)}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cardFlash.cardImageUrl} alt={cardFlash.name} className="w-full h-full object-cover" />
                </motion.div>
              )}
              <p
                className="font-black leading-none"
                style={{
                  fontFamily: 'Bebas Neue, sans-serif',
                  fontSize: 'clamp(60px, 18vw, 100px)',
                  color: cardFlash.type === 'goal' ? (cardFlash.isMine ? '#22c55e' : '#ef4444') : '#60a5fa',
                  textShadow: cardFlash.type === 'goal'
                    ? (cardFlash.isMine ? '0 0 60px rgba(34,197,94,0.6)' : '0 0 60px rgba(239,68,68,0.6)')
                    : '0 0 60px rgba(96,165,250,0.6)',
                }}
              >
                {cardFlash.type === 'goal' ? 'BUT !' : 'ARRÊT !'}
              </p>
              <p className="text-white text-lg font-bold drop-shadow-lg">
                {cardFlash.type === 'goal' ? '⚽' : '🧤'} {cardFlash.name}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function rarityGlow(rarity: string): string {
  const map: Record<string, string> = { Legend: 'rgba(245,197,24,0.7)', Epic: 'rgba(168,85,247,0.7)', Rare: 'rgba(0,212,255,0.6)', Common: 'rgba(255,255,255,0.3)' }
  return map[rarity] ?? map.Common
}

// ── MatchPitch ────────────────────────────────────────────────────────────────

function MatchPitch({ ballPos, challengerPseudo, opponentPseudo }: {
  ballPos: { x: number; y: number }; challengerPseudo: string; opponentPseudo: string
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden flex-shrink-0" style={{ height: 152, background: 'linear-gradient(180deg, #1a4a1a 0%, #1e5c1e 50%, #1a4a1a 100%)' }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 12px, rgba(0,0,0,0.2) 12px, rgba(0,0,0,0.2) 24px)' }} />
      <p className="absolute top-2 left-3 text-white/35 text-[9px] font-black uppercase tracking-wide truncate max-w-[70px] z-10">{challengerPseudo}</p>
      <p className="absolute top-2 right-3 text-white/35 text-[9px] font-black uppercase tracking-wide truncate max-w-[70px] text-right z-10">{opponentPseudo}</p>
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" style={{ width: 60, height: 60 }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/25" />
      <div className="absolute top-1/2 -translate-y-1/2 left-0 border-r border-t border-b border-white/15 rounded-r" style={{ width: 28, height: 76 }} />
      <div className="absolute top-1/2 -translate-y-1/2 right-0 border-l border-t border-b border-white/15 rounded-l" style={{ width: 28, height: 76 }} />
      <div className="absolute top-1/2 -translate-y-1/2 left-0 rounded-r" style={{ width: 7, height: 32, background: 'rgba(255,255,255,0.12)', borderRight: '1px solid rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
      <div className="absolute top-1/2 -translate-y-1/2 right-0 rounded-l" style={{ width: 7, height: 32, background: 'rgba(255,255,255,0.12)', borderLeft: '1px solid rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
      <motion.div
        animate={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
        transition={{ type: 'spring', stiffness: 55, damping: 11 }}
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: 14, height: 14, background: 'radial-gradient(circle at 35% 35%, #ffffff, #cccccc)', boxShadow: '0 0 10px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.5)', zIndex: 20 }}
      />
    </div>
  )
}

// ── TiebreakView ─────────────────────────────────────────────────────────────

function TiebreakView({ duel }: { duel: Duel }) {
  const router = useRouter()
  const penaltyId = duel.tiebreak_battle_id as string | null

  useEffect(() => {
    if (penaltyId) {
      const t = setTimeout(() => router.push(`/battles/penalty/${penaltyId}`), 2000)
      return () => clearTimeout(t)
    }
  }, [penaltyId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 gap-6 max-w-sm mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
        className="w-24 h-24 rounded-3xl bg-orange-500/10 flex items-center justify-center"
        style={{ boxShadow: '0 0 40px rgba(249,115,22,0.25)' }}
      >
        <span className="text-5xl">⚽</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-black text-orange-400 text-center"
        style={{ fontFamily: 'Bebas Neue, sans-serif' }}
      >
        ÉGALITÉ !
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white/60 text-sm text-center"
      >
        Scores identiques — départage aux tirs au but
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: 'spring' }}
        className="glass rounded-2xl p-4 flex items-center gap-3 w-full border border-orange-500/20"
      >
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="text-orange-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Tirs au but</p>
          <p className="text-white/50 text-xs">Tes 3 tireurs et ton gardien ont été sélectionnés automatiquement</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full"
      >
        {penaltyId ? (
          <button
            onClick={() => router.push(`/battles/penalty/${penaltyId}`)}
            className="w-full bg-orange-500 text-white font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            <Zap size={20} /> JOUER LES TIRS AU BUT
          </button>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-orange-400/40 border-t-orange-400 rounded-full animate-spin" />
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── StealingView ──────────────────────────────────────────────────────────────

function StealingView({ duel, currentUserId, onDone }: { duel: Duel; currentUserId: string; onDone: () => void }) {
  const supabase = createClient()
  const isWinner = duel.winner_id === currentUserId
  const stakeCount: number = duel.stake_count ?? 1
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)

  // Derive loser's cards from their picks stored in the duel
  const loserPicks = useMemo(() => {
    const picks = (duel.winner_id === duel.challenger_id ? duel.opponent_picks : duel.challenger_picks) as Card[] | null
    const available = new Set<string>(duel.stolen_card_ids ?? [])
    return (picks ?? []).filter((c: Card) => available.has(c.id))
  }, [duel])

  // Realtime: when finished → onDone
  useEffect(() => {
    const ch = supabase
      .channel(`steal-${duel.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${duel.id}` },
        ({ new: updated }) => {
          if ((updated as Duel).status === 'finished') onDone()
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [duel.id, onDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown (winner only)
  useEffect(() => {
    if (!isWinner) return
    const t = setInterval(() => setCountdown((c) => {
      if (c <= 1) {
        clearInterval(t)
        // Auto-select best by rarity
        const sorted = [...loserPicks].sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))
        const ids = sorted.slice(0, stakeCount).map((c) => c.id)
        handleSteal(ids)
        return 0
      }
      return c - 1
    }), 1000)
    return () => clearInterval(t)
  }, [isWinner, loserPicks, stakeCount]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds((s) => s.filter((x) => x !== id))
    } else if (selectedIds.length < stakeCount) {
      setSelectedIds((s) => [...s, id])
    }
  }

  async function handleSteal(ids: string[]) {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/duels/${duel.id}/steal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: ids }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      onDone()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  if (!isWinner) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-16 h-16 rounded-full border-2 border-[#F5C518]/30 border-t-[#F5C518]" />
        <div className="text-center">
          <h2 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>MATCH TERMINÉ</h2>
          <p className="text-gray-400">Le gagnant choisit ses récompenses…</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="min-h-screen px-4 py-6 max-w-md mx-auto pb-28">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-black text-[#F5C518] mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          CHOISIS TES BUTINS ⚡
        </h2>
        <p className="text-gray-400 text-sm">
          Sélectionne <span className="text-[#F5C518] font-bold">{stakeCount}</span> carte{stakeCount > 1 ? 's' : ''} à voler
          {' '}· <span className="font-mono text-[#F5C518]">{countdown}s</span>
        </p>
      </div>

      {loserPicks.length === 0 ? (
        <p className="text-center text-gray-500">Aucune carte disponible</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {loserPicks.map((card: Card) => {
            const sel = selectedIds.includes(card.id)
            return (
              <motion.div key={card.id} whileTap={{ scale: 0.93 }}
                className={`rounded-2xl cursor-pointer transition-all ${sel ? 'ring-2 ring-[#F5C518] scale-105' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => toggle(card.id)}>
                <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                {sel && (
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <Star size={12} className="text-[#F5C518] fill-[#F5C518]" />
                    <span className="text-[#F5C518] text-[10px] font-black">SÉLECTIONNÉ</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-md mx-auto">
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={selectedIds.length !== stakeCount || loading}
          onClick={() => handleSteal(selectedIds)}
          className="w-full bg-[#F5C518] disabled:opacity-30 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-xl shadow-yellow-500/20"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" /> TRANSFERT…</>
          ) : (
            <><Gift size={18} /> PRENDRE {selectedIds.length}/{stakeCount}</>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── ResultView ────────────────────────────────────────────────────────────────

function ResultView({ duel, currentUserId, me, them, onReplay, replayLoading }: {
  duel: Duel; currentUserId: string; me: Profile; them: Profile; onReplay: () => void; replayLoading?: boolean
}) {
  const router = useRouter()
  const tournamentId = duel.tournament_id as string | null
  const isChallenger = duel.challenger_id === currentUserId
  const winnerId = duel.winner_id as string | null
  const iWon = winnerId === currentUserId
  const myScore = isChallenger ? duel.challenger_score : duel.opponent_score
  const theirScore = isChallenger ? duel.opponent_score : duel.challenger_score
  const isDraw = !winnerId && (myScore ?? 0) === (theirScore ?? 0)
  const stolenCards = useMemo(() => {
    if (!duel.stolen_card_ids?.length) return []
    // Winner → show loser's picks (cards stolen from opponent)
    // Loser  → show own picks (cards stolen from me)
    const loserPicks = (iWon
      ? (isChallenger ? duel.opponent_picks   : duel.challenger_picks)
      : (isChallenger ? duel.challenger_picks : duel.opponent_picks)) as Card[] | null
    const ids = new Set<string>(duel.stolen_card_ids)
    return (loserPicks ?? []).filter((c: Card) => ids.has(c.id))
  }, [duel, iWon, isChallenger])

  const flag = (nation: string) => NATION_FLAGS[nation] ?? '🌍'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 gap-5 max-w-sm mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
        className={`w-24 h-24 rounded-3xl flex items-center justify-center ${isDraw ? 'bg-white/5' : iWon ? 'bg-[#F5C518]/10' : 'bg-red-500/10'}`}
        style={{ boxShadow: isDraw ? 'none' : iWon ? '0 0 40px rgba(245,197,24,0.25)' : '0 0 40px rgba(239,68,68,0.2)' }}
      >
        {isDraw ? <Minus size={48} className="text-white/40" /> : iWon ? <Trophy size={48} className="text-[#F5C518]" /> : <TrendingDown size={48} className="text-red-400" />}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`text-6xl font-black ${isDraw ? 'text-gray-300' : iWon ? 'text-[#F5C518]' : 'text-red-400'}`}
        style={{ fontFamily: 'Bebas Neue, sans-serif' }}
      >
        {isDraw ? 'MATCH NUL' : iWon ? 'VICTOIRE !' : 'DÉFAITE'}
      </motion.h2>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="glass rounded-2xl px-8 py-4 flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl">{flag(me?.nation)}</p>
          <p className="text-white font-black text-xs mt-1">{me?.pseudo}</p>
        </div>
        <div className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {myScore} — {theirScore}
        </div>
        <div className="text-center">
          <p className="text-2xl">{flag(them?.nation)}</p>
          <p className="text-white font-black text-xs mt-1">{them?.pseudo}</p>
        </div>
      </motion.div>

      {/* Stolen cards display */}
      {stolenCards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className={`w-full glass rounded-2xl p-4 flex flex-col items-center gap-3 border ${iWon ? 'border-[#F5C518]/30' : 'border-red-500/20'}`}
        >
          <p className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${iWon ? 'text-[#F5C518]' : 'text-red-400'}`}>
            {iWon ? <><Gift size={12} /> Cartes volées</> : <><ArrowDownRight size={12} /> Cartes perdues</>}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {stolenCards.map((card: Card) => (
              <div key={card.id} className="text-center">
                <GameCard card={card} owned size="sm" />
                <p className="text-white/60 text-[9px] mt-1 truncate max-w-16">{card.name}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex gap-3 w-full">
        {tournamentId ? (
          <button
            onClick={() => router.push(`/battles/tournament/${tournamentId}`)}
            className="flex-1 bg-[#F5C518] text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            <Trophy size={16} /> RETOUR AU TOURNOI
          </button>
        ) : (
          <>
            <button
              onClick={onReplay}
              disabled={replayLoading}
              className="flex-1 bg-[#F5C518] disabled:opacity-60 text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {replayLoading
                ? <><div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" /> RECHERCHE…</>
                : <><RotateCcw size={16} /> REJOUER</>
              }
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: iWon ? `Victoire ${myScore}-${theirScore} !` : `Défaite ${myScore}-${theirScore}`, text: 'Je viens de jouer un duel sur WorldSquad !' }).catch(() => {})
                }
              }}
              className="px-4 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <Share2 size={16} />
            </button>
          </>
        )}
      </motion.div>

      <div className="flex gap-4 text-center text-xs text-gray-700">
        <div className="flex items-center gap-1"><Zap size={10} /> Moi : {myScore ?? 0}</div>
        <div className="flex items-center gap-1"><Shield size={10} /> Eux : {theirScore ?? 0}</div>
      </div>
    </motion.div>
  )
}
