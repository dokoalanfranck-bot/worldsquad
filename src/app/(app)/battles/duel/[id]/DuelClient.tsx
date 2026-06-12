'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Clock, Check, Share2, RotateCcw, Zap, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GameCard } from '@/components/ui/Card'
import { computePower } from '@/lib/duel-engine'
import toast from 'react-hot-toast'
import type { Card } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile { id: string | null; pseudo: string; nation: string; photo_url: string | null }
interface DuelEvent {
  minute: number; timeMs: number
  team: 'challenger' | 'opponent'
  playerName: string; type: 'goal' | 'chance' | 'save'
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
  const [view, setView] = useState<'waiting' | 'picking' | 'animation' | 'result'>(() => {
    if (initialDuel.status === 'finished') return 'result'
    if (initialDuel.status === 'picking') return 'picking'
    return 'waiting'
  })

  const isChallenger = duel.challenger_id === currentUserId
  const me = (isChallenger ? duel.challenger : duel.opponent) as Profile
  const them = (isChallenger ? duel.opponent : duel.challenger) as Profile

  const myPicks = (isChallenger ? duel.challenger_picks : duel.opponent_picks) as Card[] | null
  const theirPicks = (isChallenger ? duel.opponent_picks : duel.challenger_picks) as Card[] | null

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel(`duel-${duel.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${duel.id}` },
        ({ new: updated }) => {
          setDuel((prev) => ({ ...prev, ...updated }))
          const s = (updated as Duel).status
          if (s === 'picking' && view === 'waiting') setView('picking')
          if (s === 'finished' && view === 'picking') setView('animation')
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
        if (data.status === 'picking' && view === 'waiting') setView('picking')
        if (data.status === 'finished' && view === 'picking') setView('animation')
      } catch { /* réseau */ }
    }, 3000)
    return () => clearInterval(poll)
  }, [duel.id, view]) // eslint-disable-line react-hooks/exhaustive-deps

  // Transition: animation → result after 23s
  useEffect(() => {
    if (view !== 'animation') return
    const t = setTimeout(() => setView('result'), 23000)
    return () => clearTimeout(t)
  }, [view])

  return (
    <div className="min-h-screen bg-[#07070f]">
      <AnimatePresence mode="wait">
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
        {view === 'result' && (
          <ResultView key="result" duel={duel} currentUserId={currentUserId} me={me} them={them}
            onReplay={() => router.push('/battles')} />
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

  // Bot fallback after 50s (only challenger triggers it)
  useEffect(() => {
    if (!isChallenger || botFiredRef.current) return
    if (elapsed < 50) return
    botFiredRef.current = true
    fetch(`/api/duels/${duel.id}/add-bot`, { method: 'POST' })
      .then((r) => r.json())
      .then((d: { success?: boolean }) => { if (d.success) onReady() })
      .catch(() => { botFiredRef.current = false })
  }, [elapsed, isChallenger, duel.id, onReady])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 gap-6"
    >
      {/* Pulse animation */}
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
          {elapsed < 40 ? 'En attente d\'un adversaire…' : 'Presque là…'}
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
        {elapsed >= 50 && (
          <p className="text-gray-600 text-xs mt-2 animate-pulse">Connexion d'un bot…</p>
        )}
      </div>

      <button
        onClick={() => router.push('/battles')}
        className="text-gray-600 hover:text-gray-400 text-sm transition-colors mt-4"
      >
        Annuler
      </button>
    </motion.div>
  )
}

// ── PickingView ───────────────────────────────────────────────────────────────

function PickingView({
  duel, currentUserId, myCards, myPicks, theirPicks, me, them, onSubmitted,
}: {
  duel: Duel; currentUserId: string; myCards: Card[]
  myPicks: Card[] | null; theirPicks: Card[] | null
  me: Profile; them: Profile
  onSubmitted: () => void
}) {
  const [selectedPlayers, setSelectedPlayers] = useState<Card[]>([])
  const [selectedCoach, setSelectedCoach] = useState<Card | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(!!myPicks)
  const [timeLeft, setTimeLeft] = useState<number>(45)

  // Countdown from picks_deadline
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

  // Auto-pick when timer hits 0
  useEffect(() => {
    if (timeLeft > 0 || submitted || myPicks) return
    const sorted = [...myCards].sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))
    const isCoach = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'COACH'
    const players = sorted.filter((c) => !isCoach(c)).slice(0, 3)
    const coach = sorted.find(isCoach) ?? sorted[3]
    if (players.length === 3 && coach) {
      submitPicks(players, coach)
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  const isCoachCard = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'COACH'
  const playerCards = useMemo(
    () => myCards.filter((c) => !isCoachCard(c)).sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0)),
    [myCards]
  )
  const coachCards = useMemo(
    () => myCards.filter(isCoachCard).sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0)),
    [myCards]
  )

  const cohesion = useMemo(() => {
    if (selectedPlayers.length === 3 && selectedCoach) {
      return computePower([...selectedPlayers, selectedCoach])
    }
    return null
  }, [selectedPlayers, selectedCoach])

  function togglePlayer(card: Card) {
    if (selectedPlayers.find((c) => c.id === card.id)) {
      setSelectedPlayers((p) => p.filter((c) => c.id !== card.id))
    } else if (selectedPlayers.length < 3) {
      setSelectedPlayers((p) => [...p, card])
    }
  }

  async function submitPicks(players: Card[], coach: Card) {
    setLoading(true)
    try {
      const res = await fetch(`/api/duels/${duel.id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: players.map((c) => c.id), coachId: coach.id }),
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

  const canSubmit = selectedPlayers.length === 3 && selectedCoach !== null

  // Color for timer
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
          <p className="text-gray-600 text-xs uppercase tracking-wider">
            {me?.pseudo} vs {them?.pseudo ?? '…'}
          </p>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            CHOISIS TON ÉQUIPE
          </h1>
        </div>

        {/* Timer */}
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
          {theirPicks
            ? `${them?.pseudo ?? 'Adversaire'} a confirmé son équipe ✓`
            : `${them?.pseudo ?? 'Adversaire'} sélectionne…`}
        </span>
        {cohesion !== null && (
          <span className="ml-auto text-xs font-black text-[#F5C518]">COHÉSION {cohesion}</span>
        )}
      </div>

      {submitted || myPicks ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-8 text-center"
        >
          <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-white font-bold text-lg">Équipe confirmée !</p>
          <p className="text-gray-500 text-sm mt-1">
            {theirPicks ? 'Simulation en cours…' : `En attente de ${them?.pseudo ?? '…'}`}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Selected slots */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`aspect-[2/3] rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${selectedPlayers[i] ? 'border-[#F5C518]/50' : 'border-white/10'}`}>
                {selectedPlayers[i]
                  ? <GameCard card={selectedPlayers[i]} owned size="sm" />
                  : <span className="text-gray-700 text-xs">J{i + 1}</span>}
              </div>
            ))}
            <div className={`aspect-[2/3] rounded-xl border-2 border-dashed flex items-center justify-center transition-all relative ${selectedCoach ? 'border-[#F5C518]/50' : 'border-white/10'}`}>
              {selectedCoach ? (
                <>
                  <GameCard card={selectedCoach} owned size="sm" />
                  <div className="absolute -top-1 -right-1 bg-[#F5C518] text-black text-[7px] font-black px-1 rounded">C</div>
                </>
              ) : (
                <span className="text-gray-700 text-xs">Coach</span>
              )}
            </div>
          </div>

          {/* Players */}
          <p className="text-white font-bold text-sm mb-2">
            Joueurs <span className="text-gray-600">({selectedPlayers.length}/3)</span>
          </p>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 mb-4">
            {playerCards.map((card) => {
              const sel = !!selectedPlayers.find((c) => c.id === card.id)
              const disabled = !sel && selectedPlayers.length >= 3
              return (
                <motion.div key={card.id} whileTap={disabled ? {} : { scale: 0.92 }}
                  className={`rounded-xl ${disabled ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'} ${sel ? 'ring-2 ring-[#F5C518]' : ''}`}
                  onClick={() => !disabled && togglePlayer(card)}>
                  <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                </motion.div>
              )
            })}
          </div>

          {/* Coach */}
          {coachCards.length > 0 ? (
            <>
              <p className="text-white font-bold text-sm mb-2">Coach</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {coachCards.map((card) => {
                  const sel = selectedCoach?.id === card.id
                  return (
                    <motion.div key={card.id} whileTap={{ scale: 0.92 }}
                      className={`rounded-xl cursor-pointer ${sel ? 'ring-2 ring-[#F5C518]' : ''}`}
                      onClick={() => setSelectedCoach(sel ? null : card)}>
                      <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                    </motion.div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-white font-bold text-sm mb-2">
                Coach <span className="text-gray-500 text-xs">(n'importe quelle carte)</span>
              </p>
              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1 mb-4">
                {myCards.filter((c) => !selectedPlayers.find((p) => p.id === c.id))
                  .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))
                  .map((card) => {
                    const sel = selectedCoach?.id === card.id
                    return (
                      <motion.div key={card.id} whileTap={{ scale: 0.92 }}
                        className={`rounded-xl cursor-pointer ${sel ? 'ring-2 ring-[#F5C518]' : ''}`}
                        onClick={() => setSelectedCoach(sel ? null : card)}>
                        <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                      </motion.div>
                    )
                  })}
              </div>
            </>
          )}
        </>
      )}

      {/* Confirm button */}
      {!submitted && !myPicks && (
        <div className="fixed bottom-20 left-0 right-0 px-4 max-w-2xl mx-auto">
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!canSubmit || loading}
            onClick={() => canSubmit && selectedCoach && submitPicks(selectedPlayers, selectedCoach)}
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

function AnimationView({ duel, isChallenger, me, them }: { duel: Duel; isChallenger: boolean; me: Profile; them: Profile }) {
  const DURATION_MS = 30000
  const [elapsed, setElapsed] = useState(0)
  const [visibleEvents, setVisibleEvents] = useState<DuelEvent[]>([])
  const [challengerGoals, setChallengerGoals] = useState(0)
  const [opponentGoals, setOpponentGoals] = useState(0)
  const startRef = useRef(Date.now())

  const events = (duel.match_events ?? []) as DuelEvent[]
  const myScore = isChallenger ? duel.challenger_score : duel.opponent_score
  const theirScore = isChallenger ? duel.opponent_score : duel.challenger_score

  useEffect(() => {
    const frame = setInterval(() => {
      const now = Date.now() - startRef.current
      setElapsed(now)
      const visible = events.filter((e) => e.timeMs <= now)
      setVisibleEvents(visible)
      setChallengerGoals(visible.filter((e) => e.type === 'goal' && e.team === 'challenger').length)
      setOpponentGoals(visible.filter((e) => e.type === 'goal' && e.team === 'opponent').length)
    }, 80)
    return () => clearInterval(frame)
  }, [events])

  const progress = Math.min(100, (elapsed / DURATION_MS) * 100)
  const displayMinute = Math.floor((elapsed / DURATION_MS) * 90)

  const myGoals = isChallenger ? challengerGoals : opponentGoals
  const theirGoals = isChallenger ? opponentGoals : challengerGoals
  const flag = (nation: string) => NATION_FLAGS[nation] ?? '🌍'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto"
    >
      {/* Scoreboard */}
      <div className="glass rounded-2xl p-5 mb-5 text-center">
        <p className="text-gray-600 text-xs uppercase tracking-widest mb-3">⚽ Match en direct</p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <p className="text-2xl mb-1">{flag(me?.nation)}</p>
            <p className="text-white font-black text-sm truncate">{me?.pseudo}</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {myGoals} — {theirGoals}
            </div>
            <p className="text-gray-600 text-xs mt-1 font-mono">{displayMinute}&apos;</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl mb-1">{flag(them?.nation)}</p>
            <p className="text-white font-black text-sm truncate">{them?.pseudo}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div className="h-full bg-[#F5C518] rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Events feed */}
      <div className="flex-1 space-y-2 overflow-hidden">
        <AnimatePresence initial={false}>
          {[...visibleEvents].reverse().slice(0, 8).map((ev, i) => {
            const isMyTeam = (isChallenger && ev.team === 'challenger') || (!isChallenger && ev.team === 'opponent')
            return (
              <motion.div
                key={`${ev.minute}-${ev.type}`}
                initial={{ opacity: 0, x: isMyTeam ? -20 : 20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                className={`glass rounded-xl px-4 py-3 flex items-center gap-3 border ${
                  ev.type === 'goal'
                    ? isMyTeam ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
                    : 'border-white/5'
                }`}
                style={{ opacity: 1 - i * 0.12 }}
              >
                <span className="text-base">
                  {ev.type === 'goal' ? '⚽' : ev.type === 'chance' ? '💨' : '🧤'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${ev.type === 'goal' ? (isMyTeam ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                    {ev.type === 'goal' ? 'BUT !' : ev.type === 'chance' ? 'Occasion' : 'Arrêt !'}
                    {' '}{ev.playerName}
                  </p>
                </div>
                <span className="text-gray-600 text-xs font-mono flex-shrink-0">{ev.minute}&apos;</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {progress < 100 && (
        <p className="text-center text-gray-700 text-xs mt-4 animate-pulse">Simulation en cours…</p>
      )}
      {progress >= 100 && (
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-[#F5C518] font-black text-xl mt-4"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          COUP DE SIFFLET FINAL !
        </motion.p>
      )}
    </motion.div>
  )
}

// ── ResultView ────────────────────────────────────────────────────────────────

function ResultView({ duel, currentUserId, me, them, onReplay }: {
  duel: Duel; currentUserId: string; me: Profile; them: Profile; onReplay: () => void
}) {
  const isChallenger = duel.challenger_id === currentUserId
  const winnerId = duel.winner_id as string | null
  const iWon = winnerId === currentUserId
  const isDraw = !winnerId
  const myScore = isChallenger ? duel.challenger_score : duel.opponent_score
  const theirScore = isChallenger ? duel.opponent_score : duel.challenger_score
  const rewardCard = duel.reward_card as Card | null

  const flag = (nation: string) => NATION_FLAGS[nation] ?? '🌍'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 gap-5 max-w-sm mx-auto"
    >
      {/* Result emoji */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
        className="text-7xl"
      >
        {isDraw ? '🤝' : iWon ? '🏆' : '💔'}
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`text-6xl font-black ${isDraw ? 'text-gray-300' : iWon ? 'text-[#F5C518]' : 'text-red-400'}`}
        style={{ fontFamily: 'Bebas Neue, sans-serif' }}
      >
        {isDraw ? 'MATCH NUL' : iWon ? 'VICTOIRE !' : 'DÉFAITE'}
      </motion.h2>

      {/* Score */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl px-8 py-4 flex items-center gap-6"
      >
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

      {/* Reward card */}
      {rewardCard && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className={`w-full glass rounded-2xl p-4 flex flex-col items-center gap-3 border ${
            iWon ? 'border-[#F5C518]/30' : 'border-red-500/20'
          }`}
        >
          <p className={`text-xs font-bold uppercase tracking-wider ${iWon ? 'text-[#F5C518]' : 'text-red-400'}`}>
            {iWon ? '🎴 Carte volée !' : '💸 Carte perdue'}
          </p>
          <GameCard card={rewardCard} owned size="md" />
          <div className="text-center">
            <p className="text-white font-bold text-sm">{rewardCard.name}</p>
            <p className="text-gray-500 text-xs capitalize">{rewardCard.rarity}</p>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3 w-full"
      >
        <button
          onClick={onReplay}
          className="flex-1 bg-[#F5C518] text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          <RotateCcw size={16} /> REJOUER
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: iWon ? `Victoire ${myScore}-${theirScore} sur WorldSquad !` : `Défaite ${myScore}-${theirScore} sur WorldSquad`,
                text: `Je viens de jouer un duel sur WorldSquad ⚽`,
              }).catch(() => {})
            }
          }}
          className="px-4 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <Share2 size={16} />
        </button>
      </motion.div>

      {/* Stats hint */}
      <div className="flex gap-4 text-center text-xs text-gray-700">
        <div className="flex items-center gap-1">
          <Zap size={10} /> Puissance moi : {isChallenger ? duel.challenger_score : duel.opponent_score}
        </div>
        <div className="flex items-center gap-1">
          <Shield size={10} /> Puissance eux : {isChallenger ? duel.opponent_score : duel.challenger_score}
        </div>
      </div>
    </motion.div>
  )
}
