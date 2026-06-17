'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GameCard } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import type { Card } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile { id: string | null; pseudo: string; nation: string; photo_url: string | null }

interface PickEntry {
  id: string; name: string; rarity: string
  image_url: string | null; stats: Record<string, number | string>
  type: string; nation: string | null
}

interface RoundResult {
  round: number; shooter_id: string; gk_id: string
  shooter_choice: string; gk_choice: string; is_goal: boolean
}

interface PenaltyBattle {
  id: string
  challenger_id: string
  opponent_id: string | null
  status: 'waiting' | 'picking' | 'active' | 'stealing' | 'finished' | 'cancelled'
  challenger_picks: PickEntry[] | null
  opponent_picks: PickEntry[] | null
  picks_deadline: string | null
  current_round: number
  challenger_score: number
  opponent_score: number
  round_deadline: string | null
  rounds: RoundResult[]
  challenger_used_panenka: boolean
  opponent_used_panenka: boolean
  winner_id: string | null
  stake_count: number
  stolen_card_ids: string[] | null
}

interface Props {
  initialBattle: PenaltyBattle
  currentUserId: string
  challenger: Profile | null
  opponent: Profile | null
  myCards: Card[]
  initialMyPicksSubmitted: boolean
  initialMyChoice: string | null
}

const RARITY_ORDER: Record<string, number> = { Legend: 4, Epic: 3, Rare: 2, Common: 1 }
const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

function useDeadlineCountdown(deadline: string | null): number {
  const [timeLeft, setTimeLeft] = useState(() =>
    deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)) : 0
  )
  useEffect(() => {
    if (!deadline) { setTimeLeft(0); return }
    setTimeLeft(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)))
    const t = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)))
    }, 500)
    return () => clearInterval(t)
  }, [deadline])
  return timeLeft
}

// ── ScoreBoard ─────────────────────────────────────────────────────────────────

function ShotDot({ state }: { state: 'goal' | 'miss' | 'current' | 'empty' }) {
  return (
    <motion.div
      initial={state === 'goal' ? { scale: 0 } : state === 'miss' ? { scale: 0 } : {}}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 450, damping: 18 }}
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${
        state === 'goal'    ? 'bg-green-500 border-green-400 shadow-[0_0_8px_#22c55e88]' :
        state === 'miss'    ? 'bg-red-900/40 border-red-500/60 text-red-400' :
        state === 'current' ? 'border-white/50 bg-white/8' :
        'border-white/12 bg-transparent'
      }`}
    >
      {state === 'goal' ? '⚽' : state === 'miss' ? '✕' : state === 'current' ? '' : ''}
    </motion.div>
  )
}

function ScoreBoard({
  battle, currentUserId, challenger, opponent,
}: {
  battle: PenaltyBattle; currentUserId: string
  challenger: Profile | null; opponent: Profile | null
}) {
  const isChallenger = battle.challenger_id === currentUserId
  const me = isChallenger ? challenger : opponent
  const them = isChallenger ? opponent : challenger
  const myScore = isChallenger ? battle.challenger_score : battle.opponent_score
  const theirScore = isChallenger ? battle.opponent_score : battle.challenger_score
  const myId = currentUserId
  const theirId = isChallenger ? battle.opponent_id : battle.challenger_id

  const rounds = (battle.rounds ?? []) as RoundResult[]
  const currentRound = battle.current_round

  // Compute dots for a player's shots (5 slots = 5 standard kicks)
  function getDots(pid: string | null): Array<'goal' | 'miss' | 'current' | 'empty'> {
    if (!pid) return Array(5).fill('empty')
    const shots = rounds.filter((r) => r.shooter_id === pid)
    // Which rounds does this player shoot? Challenger=odd, Opponent=even
    const isPlayerChallenger = pid === battle.challenger_id
    const playerShootingRounds = [1, 3, 5, 7, 9].filter((r) => isPlayerChallenger ? r % 2 === 1 : r % 2 === 0)
    return Array.from({ length: 5 }, (_, i) => {
      const expectedRound = playerShootingRounds[i]
      if (!expectedRound) return 'empty'
      const shot = shots.find((r) => r.round === expectedRound)
      if (shot) return shot.is_goal ? 'goal' : 'miss'
      if (expectedRound === currentRound) return 'current'
      if (expectedRound < currentRound) return 'miss'
      return 'empty'
    })
  }

  const myDots = getDots(myId)
  const theirDots = getDots(theirId ?? null)
  const delta = myScore - theirScore
  const leaderText = delta > 0 ? 'VOUS MENEZ' : delta < 0 ? 'ILS MÈNENT' : 'ÉGALITÉ'
  const leaderColor = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#a1a1aa'

  return (
    <div className="px-4 pt-4 pb-3 max-w-2xl mx-auto">
      {/* Leader badge */}
      <div className="flex justify-center mb-2">
        <motion.div
          key={leaderText}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
          style={{ color: leaderColor, background: `${leaderColor}18`, border: `1px solid ${leaderColor}40` }}
        >
          {leaderText}
        </motion.div>
      </div>

      {/* Score row */}
      <div className="flex items-center justify-between gap-4">
        {/* Me */}
        <div className="flex-1 text-left">
          <p className="text-white/40 text-[10px] uppercase truncate">{flag(me?.nation ?? '')} {me?.pseudo}</p>
          <motion.p
            key={myScore}
            initial={{ scale: 1.4, color: '#22c55e' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.4 }}
            className="text-5xl font-black leading-none tabular-nums"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            {myScore}
          </motion.p>
          <div className="flex gap-1 mt-1.5">
            {myDots.map((d, i) => <ShotDot key={i} state={d} />)}
          </div>
        </div>

        {/* Separator */}
        <div className="text-white/20 font-black text-2xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>—</div>

        {/* Them */}
        <div className="flex-1 text-right">
          <p className="text-white/40 text-[10px] uppercase truncate">{flag(them?.nation ?? '')} {them?.pseudo}</p>
          <motion.p
            key={theirScore}
            initial={{ scale: 1.4, color: '#ef4444' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.4 }}
            className="text-5xl font-black leading-none tabular-nums"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            {theirScore}
          </motion.p>
          <div className="flex gap-1 mt-1.5 justify-end">
            {theirDots.map((d, i) => <ShotDot key={i} state={d} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── GoalAnimation ─────────────────────────────────────────────────────────────

const BALL_TARGET: Record<string, { x: number; y: number; scale: number }> = {
  left:    { x: -88, y: -90,  scale: 0.5  },
  center:  { x: 0,   y: -118, scale: 0.45 },
  right:   { x: 88,  y: -90,  scale: 0.5  },
  panenka: { x: 0,   y: -142, scale: 0.38 },
}
const GK_TARGET: Record<string, { x: number; rotate: number }> = {
  left:    { x: -75, rotate: -62 },
  center:  { x: 0,   rotate: 0   },
  right:   { x: 75,  rotate: 62  },
  panenka: { x: 0,   rotate: 6   },
}

function GoalAnimation({
  result, onDone, newCScore, newOScore, isChallenger,
}: {
  result: RoundResult; onDone: () => void
  newCScore: number; newOScore: number; isChallenger: boolean
}) {
  const isGoal = result.is_goal
  const ball = BALL_TARGET[result.shooter_choice] ?? BALL_TARGET.center
  const gk = GK_TARGET[result.gk_choice] ?? GK_TARGET.center
  const [phase, setPhase] = useState<'fly' | 'result' | 'score'>('fly')
  const myScore = isChallenger ? newCScore : newOScore
  const theirScore = isChallenger ? newOScore : newCScore

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('result'), 650)
    const t2 = setTimeout(() => setPhase('score'), 1250)
    const t3 = setTimeout(() => onDone(), 2100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  const glowColor = isGoal ? '#22c55e' : '#3b82f6'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.95)' }}
    >
      {/* Crowd flash */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'result' || phase === 'score' ? 0.22 : 0 }}
        transition={{ duration: 0.35 }}
        style={{ background: `radial-gradient(ellipse at 50% 60%, ${glowColor} 0%, transparent 65%)` }}
      />

      {/* Spotlight lines */}
      {isGoal && phase !== 'fly' && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
          style={{
            background: 'conic-gradient(from 180deg at 50% 100%, transparent 60deg, rgba(255,255,255,0.03) 90deg, transparent 120deg, rgba(255,255,255,0.03) 150deg, transparent 180deg, rgba(255,255,255,0.03) 210deg, transparent 240deg)',
          }}
        />
      )}

      {/* Goal frame */}
      <div className="relative" style={{ width: 300, height: 178 }}>
        <svg className="absolute inset-0" width="300" height="178" viewBox="0 0 300 178">
          {/* Net — vertical */}
          {Array.from({ length: 12 }, (_, i) => (
            <line key={`nv${i}`} x1={14 + i * 24} y1="14" x2={14 + i * 24} y2="158"
              stroke="rgba(255,255,255,0.055)" strokeWidth="1" />
          ))}
          {/* Net — horizontal */}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`nh${i}`} x1="14" y1={14 + i * 24} x2="286" y2={14 + i * 24}
              stroke="rgba(255,255,255,0.055)" strokeWidth="1" />
          ))}
          {/* Goal flash on score */}
          {isGoal && phase === 'score' && (
            <rect x="14" y="14" width="272" height="144" fill="rgba(34,197,94,0.07)" rx="2" />
          )}
          {/* Posts */}
          <line x1="14" y1="14" x2="14" y2="162" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <line x1="286" y1="14" x2="286" y2="162" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <line x1="14" y1="14" x2="286" y2="14" stroke="white" strokeWidth="6" strokeLinecap="round" />
          {/* Ground */}
          <line x1="0" y1="162" x2="300" y2="162" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          {/* Penalty spot */}
          <circle cx="150" cy="171" r="3.5" fill="rgba(255,255,255,0.22)" />
          {/* Penalty arc line */}
          <line x1="90" y1="162" x2="210" y2="162" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
        </svg>

        {/* GK silhouette */}
        <motion.div
          className="absolute"
          style={{ bottom: 10, left: '50%', marginLeft: -14 }}
          initial={{ x: 0, rotate: 0 }}
          animate={{ x: gk.x, rotate: gk.rotate }}
          transition={{ delay: 0.12, duration: 0.45, ease: [0.18, 0, 0.38, 1] }}
        >
          <svg width="28" height="44" viewBox="0 0 28 44" fill="rgba(255,255,255,0.72)">
            {/* Head */}
            <circle cx="14" cy="6" r="6" />
            {/* Body */}
            <rect x="7" y="13" width="14" height="16" rx="4" />
            {/* Arms */}
            <rect x="-4" y="15" width="12" height="5" rx="2.5" />
            <rect x="20" y="15" width="12" height="5" rx="2.5" />
            {/* Legs */}
            <rect x="7" y="29" width="5" height="14" rx="2.5" />
            <rect x="16" y="29" width="5" height="14" rx="2.5" />
          </svg>
        </motion.div>

        {/* Ball */}
        <motion.div
          className="absolute text-4xl select-none"
          style={{ bottom: 5, left: '50%', marginLeft: -20 }}
          initial={{ x: 0, y: 0, scale: 1, rotate: 0 }}
          animate={{ x: ball.x, y: ball.y, scale: ball.scale, rotate: result.shooter_choice === 'panenka' ? 360 : (result.shooter_choice === 'left' ? -270 : 270) }}
          transition={{ duration: 0.6, ease: [0.12, 0.0, 0.22, 1.0] }}
        >
          ⚽
        </motion.div>
      </div>

      {/* Result text */}
      <AnimatePresence mode="wait">
        {phase === 'fly' && (
          <motion.div key="fly" initial={{ opacity: 0 }} animate={{ opacity: 0 }} className="h-24" />
        )}
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.3, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            className="text-center"
          >
            <p className="text-8xl font-black leading-none" style={{
              fontFamily: 'Bebas Neue, sans-serif',
              color: isGoal ? '#22c55e' : '#60a5fa',
              textShadow: `0 0 60px ${isGoal ? '#22c55e' : '#60a5fa'}99`,
            }}>
              {isGoal ? 'BUT !' : 'ARRÊT !'}
            </p>
            <p className="text-white/35 text-xs mt-2 uppercase tracking-widest font-bold">
              {result.shooter_choice === 'panenka' ? '⭐ Panenka'
                : result.shooter_choice === 'left' ? '← Gauche'
                : result.shooter_choice === 'center' ? '↑ Centre'
                : 'Droite →'}
              {'  ·  GK '}
              {result.gk_choice === 'left' ? '←' : result.gk_choice === 'center' ? '↑' : '→'}
            </p>
          </motion.div>
        )}
        {phase === 'score' && (
          <motion.div
            key="score"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.p
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              className="text-7xl font-black tabular-nums"
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                color: isGoal ? '#22c55e' : '#60a5fa',
                textShadow: `0 0 40px ${isGoal ? '#22c55e' : '#60a5fa'}88`,
              }}
            >
              {myScore} <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span> {theirScore}
            </motion.p>
            <p className="text-white/30 text-xs mt-1 uppercase tracking-widest">Score</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── WaitingView ───────────────────────────────────────────────────────────────

function WaitingView({ battle, isChallenger }: { battle: PenaltyBattle; isChallenger: boolean }) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)

  async function cancel() {
    setCancelling(true)
    await fetch(`/api/penalty/${battle.id}/cancel`, { method: 'POST' })
    router.push('/battles')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-8">
      <div className="text-center">
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3">⚽ Tirs au but</p>
        <h1 className="text-5xl font-black text-white mb-3" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          RECHERCHE EN COURS
        </h1>
        <p className="text-white/40 text-sm">En attente d'un adversaire…</p>
      </div>
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-5xl"
      >
        ⚽
      </motion.div>
      {isChallenger && (
        <button onClick={cancel} disabled={cancelling}
          className="text-white/30 hover:text-white/50 text-sm underline transition-colors disabled:opacity-50">
          {cancelling ? 'Annulation…' : 'Annuler la recherche'}
        </button>
      )}
    </div>
  )
}

// ── PickingView ───────────────────────────────────────────────────────────────

function PickingView({
  battle, currentUserId, challenger, opponent, myCards, initialMyPicksSubmitted,
}: {
  battle: PenaltyBattle; currentUserId: string
  challenger: Profile | null; opponent: Profile | null
  myCards: Card[]; initialMyPicksSubmitted: boolean
}) {
  const router = useRouter()
  const isChallenger = battle.challenger_id === currentUserId
  const me = isChallenger ? challenger : opponent
  const them = isChallenger ? opponent : challenger
  const myPicks = isChallenger ? battle.challenger_picks : battle.opponent_picks
  const theirPicks = isChallenger ? battle.opponent_picks : battle.challenger_picks

  const [selectedShooters, setSelectedShooters] = useState<Card[]>([])
  const [selectedGK, setSelectedGK] = useState<Card | null>(null)
  const [tab, setTab] = useState<'shooters' | 'gk'>('shooters')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(initialMyPicksSubmitted || !!myPicks)
  const [cancelling, setCancelling] = useState(false)

  async function cancelBattle() {
    setCancelling(true)
    try {
      await fetch(`/api/penalty/${battle.id}/cancel`, { method: 'POST' })
      router.push('/battles')
    } catch { toast.error('Erreur réseau'); setCancelling(false) }
  }

  const timeLeft = useDeadlineCountdown(battle.picks_deadline)

  const sorted = useMemo(() =>
    [...myCards].sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))
  , [myCards])

  const gkCards = useMemo(() =>
    sorted.filter((c) => typeof c.stats?.position === 'string' && (c.stats.position as string).toUpperCase() === 'GK')
  , [sorted])

  useEffect(() => {
    if (timeLeft === 0 && !submitted && sorted.length >= 4) {
      submitPicks(sorted.slice(0, 3), sorted[3])
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleShooter(card: Card) {
    setSelectedShooters((s) => {
      if (s.find((c) => c.id === card.id)) return s.filter((c) => c.id !== card.id)
      if (s.length >= 3) return s
      return [...s, card]
    })
  }

  async function submitPicks(shooters: Card[], gk: Card) {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/penalty/${battle.id}/pick-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shooterCardIds: shooters.map((c) => c.id), gkCardId: gk.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setSubmitted(true)
    } catch { toast.error('Erreur réseau') }
    finally { setLoading(false) }
  }

  const canSubmit = selectedShooters.length === 3 && selectedGK !== null
  const timerColor = timeLeft <= 10 ? '#ef4444' : '#22c55e'

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="min-h-screen px-4 py-4 max-w-2xl mx-auto pb-28">

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={cancelBattle}
            disabled={cancelling || submitted || !!myPicks}
            className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30 flex-shrink-0"
          >
            {cancelling
              ? <div className="w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin" />
              : <span className="text-xs font-bold">✕</span>}
          </button>
          <div>
            <p className="text-white/30 text-xs">{me?.pseudo} vs {them?.pseudo ?? '…'}</p>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              ⚽ CHOISIS TON ÉQUIPE
            </h1>
          </div>
        </div>
        <motion.div
          animate={{ scale: timeLeft <= 10 ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
          className="flex flex-col items-center glass rounded-xl px-4 py-2"
        >
          <span className="text-xl font-black font-mono" style={{ color: timerColor, fontFamily: 'Bebas Neue, sans-serif' }}>
            {timeLeft}
          </span>
        </motion.div>
      </div>

      <div className="glass rounded-xl p-3 mb-4 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${theirPicks ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
        <span className="text-sm text-white/40">
          {theirPicks
            ? `${them?.pseudo ?? 'Adversaire'} a confirmé son équipe ✓`
            : `${them?.pseudo ?? 'Adversaire'} sélectionne…`}
        </span>
      </div>

      {submitted || myPicks ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-white font-bold text-lg">Équipe confirmée !</p>
          <p className="text-white/40 text-sm mt-1">
            {theirPicks ? 'Les tirs commencent…' : `En attente de ${them?.pseudo ?? '…'}`}
          </p>
        </motion.div>
      ) : (
        <>
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`aspect-[2/3] rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${selectedShooters[i] ? 'border-green-500/50' : 'border-white/10'}`}>
                  {selectedShooters[i]
                    ? <GameCard card={selectedShooters[i]} owned size="sm" />
                    : <span className="text-white/20 text-[10px]">Tireur {i + 1}</span>}
                </div>
              ))}
            </div>
            <div className={`aspect-[2/3] w-1/3 mx-auto rounded-xl border-2 border-dashed flex flex-col items-center justify-center relative transition-all ${selectedGK ? 'border-blue-400/50' : 'border-white/10'}`}>
              {selectedGK ? (
                <>
                  <GameCard card={selectedGK} owned size="sm" />
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[7px] font-black px-1 rounded">GK</div>
                </>
              ) : <span className="text-white/20 text-xs">Gardien</span>}
            </div>
          </div>

          <div className="flex gap-1 mb-3 glass rounded-xl p-1">
            {([['shooters', `Tireurs (${selectedShooters.length}/3)`], ['gk', `Gardien${selectedGK ? ' ✓' : ''}`]] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${tab === t ? 'bg-green-500 text-black' : 'text-white/40'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
            {tab === 'shooters' && sorted.map((card) => {
              const sel = !!selectedShooters.find((c) => c.id === card.id)
              const usedAsGK = selectedGK?.id === card.id
              const disabled = usedAsGK || (!sel && selectedShooters.length >= 3)
              return (
                <motion.div key={card.id} whileTap={disabled ? {} : { scale: 0.92 }}
                  className={`rounded-xl ${disabled ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'} ${sel ? 'ring-2 ring-green-400' : ''}`}
                  onClick={() => !disabled && toggleShooter(card)}>
                  <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                </motion.div>
              )
            })}
            {tab === 'gk' && (gkCards.length > 0 ? gkCards : sorted)
              .filter((c) => !selectedShooters.find((s) => s.id === c.id))
              .map((card) => {
                const sel = selectedGK?.id === card.id
                return (
                  <motion.div key={card.id} whileTap={{ scale: 0.92 }}
                    className={`rounded-xl cursor-pointer ${sel ? 'ring-2 ring-blue-400' : ''}`}
                    onClick={() => setSelectedGK(sel ? null : card)}>
                    <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                  </motion.div>
                )
              })}
          </div>
        </>
      )}

      {!submitted && !myPicks && (
        <div className="fixed bottom-20 left-0 right-0 px-4 max-w-2xl mx-auto">
          <motion.button whileTap={{ scale: 0.98 }}
            disabled={!canSubmit || loading}
            onClick={() => canSubmit && selectedGK && submitPicks(selectedShooters, selectedGK)}
            className="w-full bg-green-500 disabled:opacity-30 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-xl shadow-green-500/20"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {loading ? 'Confirmation…' : 'CONFIRMER MON ÉQUIPE ⚽'}
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

// ── ActiveView ────────────────────────────────────────────────────────────────

type RoundPhase = 'intro' | 'choosing' | 'waiting'

function ActiveView({
  battle, currentUserId, challenger, opponent, initialMyChoice, onRoundResolved, isAnimating,
}: {
  battle: PenaltyBattle
  currentUserId: string
  challenger: Profile | null
  opponent: Profile | null
  initialMyChoice: string | null
  onRoundResolved: (r: RoundResult) => void
  isAnimating: boolean
}) {
  const isChallenger = battle.challenger_id === currentUserId
  const me = isChallenger ? challenger : opponent
  const them = isChallenger ? opponent : challenger
  const myPicks = ((isChallenger ? battle.challenger_picks : battle.opponent_picks) ?? []) as PickEntry[]
  const theirPicks = ((isChallenger ? battle.opponent_picks : battle.challenger_picks) ?? []) as PickEntry[]

  const round = battle.current_round
  const shooterId = round % 2 === 1 ? battle.challenger_id : battle.opponent_id
  const iAmShooter = shooterId === currentUserId

  const shooterPickIdx = Math.floor((round - 1) / 2) % 3
  const myShooterCard = myPicks[shooterPickIdx] as unknown as Card | undefined
  const myGKCard = myPicks[3] as unknown as Card | undefined
  const theirShooterCard = theirPicks[shooterPickIdx] as unknown as Card | undefined
  const theirGKCard = theirPicks[3] as unknown as Card | undefined

  // Cards for display: who shoots, who guards
  const shooterCard = iAmShooter ? myShooterCard : theirShooterCard
  const gkCard = iAmShooter ? theirGKCard : myGKCard
  const shooterProfile = iAmShooter ? me : them
  const gkProfile = iAmShooter ? them : me

  const timeLeft = useDeadlineCountdown(isAnimating ? null : battle.round_deadline)
  const [myChoice, setMyChoice] = useState<string | null>(initialMyChoice)
  const [phase, setPhase] = useState<RoundPhase>(() => initialMyChoice ? 'waiting' : 'choosing')
  const [loading, setLoading] = useState(false)
  const usedPanenka = isChallenger ? battle.challenger_used_panenka : battle.opponent_used_panenka

  const prevRoundRef = useRef(round)
  const autoSubmitGuardRef = useRef(false) // prevents instant auto-submit on stale deadline

  // Detect round change → show intro for new round
  useEffect(() => {
    if (round !== prevRoundRef.current) {
      prevRoundRef.current = round
      setMyChoice(null)
      autoSubmitGuardRef.current = false
      setPhase('intro')
    }
  }, [round])

  // 'intro' auto-advances to 'choosing' after 1600ms
  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => setPhase('choosing'), 1600)
    return () => clearTimeout(t)
  }, [phase])

  // Guard: only allow auto-submit if timer has been > 5 at some point
  useEffect(() => {
    if (timeLeft > 5) autoSubmitGuardRef.current = true
  }, [timeLeft])

  // Auto-submit on deadline
  useEffect(() => {
    if (timeLeft === 0 && phase === 'choosing' && !myChoice && autoSubmitGuardRef.current) {
      const choices = ['left', 'center', 'right'] as const
      submitChoice(choices[Math.floor(Math.random() * 3)])
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitChoice(choice: string) {
    if (loading || myChoice || phase !== 'choosing') return
    // Optimistic: mark immediately
    setMyChoice(choice)
    setPhase('waiting')
    setLoading(true)
    try {
      const res = await fetch(`/api/penalty/${battle.id}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      })
      const data = await res.json() as {
        submitted: boolean; resolved: boolean
        roundResult?: RoundResult; alreadySubmitted?: boolean; error?: string
      }
      if (!res.ok) {
        toast.error(data.error ?? 'Erreur')
        setMyChoice(null); setPhase('choosing')
        return
      }
      if (data.resolved && data.roundResult) {
        onRoundResolved(data.roundResult)
      }
    } catch {
      toast.error('Erreur réseau')
      setMyChoice(null); setPhase('choosing')
    }
    finally { setLoading(false) }
  }

  const timerPct = battle.round_deadline && !isAnimating
    ? Math.max(0, Math.min(1, (new Date(battle.round_deadline).getTime() - Date.now()) / 15000))
    : 0
  const timerColor = isAnimating ? '#52525b' : timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f59e0b' : '#22c55e'

  const directions = [
    { id: 'left',   label: '←', sub: 'Gauche'  },
    { id: 'center', label: '↑', sub: 'Centre'  },
    { id: 'right',  label: '→', sub: 'Droite'  },
  ] as const

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Atmosphere pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: phase === 'choosing' ? [0.04, 0.10, 0.04] : 0 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(ellipse at 50% 100%, #22c55e 0%, transparent 55%)' }}
      />

      {/* Intro overlay */}
      <AnimatePresence>
        {phase === 'intro' && !isAnimating && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black/85"
          >
            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-white/25 uppercase tracking-[0.35em] text-[11px] font-bold"
            >
              Tir numéro
            </motion.p>
            <motion.p
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 16, delay: 0.1 }}
              className="text-9xl font-black leading-none"
              style={{ fontFamily: 'Bebas Neue, sans-serif', color: '#22c55e', textShadow: '0 0 60px #22c55e66' }}
            >
              {Math.ceil(round / 2)}
            </motion.p>

            {shooterCard && (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 280, damping: 18 }}
                className="w-28 relative"
              >
                <GameCard card={shooterCard} owned size="sm" />
              </motion.div>
            )}

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-center"
            >
              <p className="text-white font-black text-base">{shooterProfile?.pseudo}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {iAmShooter ? '⚽ Préparez votre tir !' : '🧤 Préparez votre plongeon !'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative px-4 py-2 max-w-2xl mx-auto">

        {/* Round label + timer ring */}
        <div className="flex items-center justify-between mb-3 pt-2">
          <div>
            <p className="text-white/25 text-[10px] uppercase tracking-widest">
              {iAmShooter ? '⚽ Vous tirez' : '🧤 Vous gardez'} · Round {round}
            </p>
          </div>
          {/* Timer ring */}
          <div className="relative flex items-center justify-center" style={{ width: 52, height: 52 }}>
            <svg className="absolute inset-0 -rotate-90" width="52" height="52">
              <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <motion.circle
                cx="26" cy="26" r="20" fill="none"
                stroke={timerColor} strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                animate={{ strokeDashoffset: (1 - timerPct) * 2 * Math.PI * 20 }}
                transition={{ duration: 0.4 }}
              />
            </svg>
            <span className="text-lg font-black font-mono tabular-nums z-10" style={{ color: timerColor, fontFamily: 'Bebas Neue, sans-serif' }}>
              {isAnimating ? '…' : timeLeft}
            </span>
          </div>
        </div>

        {/* Cards: who shoots vs who guards */}
        <div className="flex items-center justify-center gap-6 mb-5">
          {/* Shooter */}
          <div className="text-center">
            <p className="text-white/25 text-[9px] uppercase tracking-wider mb-1">
              {iAmShooter ? 'Vous' : them?.pseudo ?? '?'}
            </p>
            <motion.div
              className="w-20"
              animate={phase === 'choosing' && iAmShooter ? {
                y: [0, -4, 0],
                filter: ['drop-shadow(0 0 0px #22c55e00)', 'drop-shadow(0 0 14px #22c55eaa)', 'drop-shadow(0 0 0px #22c55e00)'],
              } : {}}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              {shooterCard
                ? <GameCard card={shooterCard} owned size="sm" />
                : <div className="aspect-[2/3] bg-white/5 rounded-xl flex items-center justify-center text-2xl">⚽</div>}
            </motion.div>
            <div className="mt-1 flex items-center justify-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-green-400 text-[9px] font-bold uppercase">Tireur</span>
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-white/10 text-xs font-black">VS</div>
            <div className="w-px h-8 bg-white/10" />
          </div>

          {/* GK */}
          <div className="text-center">
            <p className="text-white/25 text-[9px] uppercase tracking-wider mb-1">
              {!iAmShooter ? 'Vous' : them?.pseudo ?? '?'}
            </p>
            <motion.div
              className="w-20"
              animate={phase === 'choosing' && !iAmShooter ? {
                y: [0, -4, 0],
                filter: ['drop-shadow(0 0 0px #3b82f600)', 'drop-shadow(0 0 14px #3b82f6aa)', 'drop-shadow(0 0 0px #3b82f600)'],
              } : {}}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              {gkCard
                ? <GameCard card={gkCard} owned size="sm" />
                : <div className="aspect-[2/3] bg-white/5 rounded-xl flex items-center justify-center text-2xl">🧤</div>}
            </motion.div>
            <div className="mt-1 flex items-center justify-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-blue-400 text-[9px] font-bold uppercase">Gardien</span>
            </div>
          </div>
        </div>

        {/* Waiting indicator */}
        <AnimatePresence>
          {phase === 'waiting' && !isAnimating && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass rounded-xl p-2.5 mb-4 flex items-center justify-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-white/45 font-medium">
                {iAmShooter ? 'Tir envoyé' : 'Plongeon confirmé'} · En attente de l&apos;adversaire…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Direction buttons */}
        <div className="space-y-3">
          <p className="text-white/35 text-[10px] text-center font-bold uppercase tracking-[0.25em]">
            {iAmShooter ? 'CHOISIR LA DIRECTION DU TIR' : 'CHOISIR LA DIRECTION DU PLONGEON'}
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {directions.map(({ id, label, sub }) => {
              const chosen = myChoice === id
              const disabled = phase !== 'choosing' || loading || isAnimating
              return (
                <motion.button
                  key={id}
                  whileTap={disabled ? {} : { scale: 0.89 }}
                  disabled={disabled}
                  onClick={() => submitChoice(id)}
                  className={`relative overflow-hidden py-5 rounded-2xl font-black uppercase tracking-wider transition-all flex flex-col items-center gap-0.5 ${
                    chosen
                      ? 'bg-green-500 text-black shadow-lg shadow-green-500/35'
                      : disabled
                        ? 'bg-white/4 text-white/15'
                        : 'bg-white/8 text-white hover:bg-white/13 border border-white/8 active:bg-white/15'
                  }`}
                  style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                >
                  {chosen && (
                    <motion.div
                      className="absolute inset-0 bg-white/25 rounded-full"
                      initial={{ scale: 0, opacity: 0.8 }}
                      animate={{ scale: 4, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                  <span className="text-2xl leading-none">{label}</span>
                  <span className="text-[10px]">{sub}</span>
                </motion.button>
              )
            })}
          </div>

          {iAmShooter && !usedPanenka && (
            <motion.button
              whileTap={phase !== 'choosing' || isAnimating ? {} : { scale: 0.97 }}
              disabled={phase !== 'choosing' || loading || isAnimating}
              onClick={() => submitChoice('panenka')}
              className={`w-full py-3 rounded-2xl font-black text-sm transition-all relative overflow-hidden flex items-center justify-center gap-2 ${
                myChoice === 'panenka'
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/35'
                  : phase !== 'choosing' || isAnimating
                    ? 'bg-white/4 text-white/15'
                    : 'bg-yellow-500/8 text-yellow-400 border border-yellow-500/25 hover:bg-yellow-500/13'
              }`}
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {myChoice === 'panenka' && (
                <motion.div
                  className="absolute inset-0 bg-white/25 rounded-full"
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
              ⭐ PANENKA <span className="text-[10px] font-normal opacity-60">(usage unique)</span>
            </motion.button>
          )}
        </div>

        {/* Round history dots (compact) */}
        {((battle.rounds?.length ?? 0) > 0) && (
          <div className="mt-5">
            <p className="text-white/15 text-[9px] uppercase tracking-widest mb-1.5">Historique des tirs</p>
            <div className="flex gap-1.5 flex-wrap">
              {((battle.rounds ?? []) as RoundResult[]).map((r, i) => {
                const iShot = r.shooter_id === currentUserId
                const positive = iShot ? r.is_goal : !r.is_goal
                return (
                  <motion.div key={i}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: i * 0.04 }}
                    title={`Round ${r.round} · ${r.is_goal ? 'But' : 'Arrêt'}`}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] border ${
                      positive
                        ? 'bg-green-500/15 border-green-500/35 text-green-400'
                        : 'bg-red-500/10 border-red-500/25 text-red-400'
                    }`}>
                    {r.is_goal ? '⚽' : '🧤'}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── StealingView ──────────────────────────────────────────────────────────────

function StealingView({
  battle, currentUserId, challenger, opponent,
}: {
  battle: PenaltyBattle; currentUserId: string
  challenger: Profile | null; opponent: Profile | null
}) {
  const router = useRouter()
  const isWinner = battle.winner_id === currentUserId
  const them = battle.challenger_id === currentUserId ? opponent : challenger
  const stakeCount: number = battle.stake_count ?? 1
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)

  const loserPicks = useMemo(() => {
    if (!battle.winner_id) return []
    const picks = battle.winner_id === battle.challenger_id ? battle.opponent_picks : battle.challenger_picks
    return (picks ?? []) as PickEntry[]
  }, [battle])

  useEffect(() => {
    if (!isWinner) return
    const t = setInterval(() => setCountdown((c) => {
      if (c <= 1) {
        clearInterval(t)
        const best = [...loserPicks]
          .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))
          .slice(0, stakeCount).map((c) => c.id)
        handleSteal(best)
        return 0
      }
      return c - 1
    }), 1000)
    return () => clearInterval(t)
  }, [isWinner, loserPicks, stakeCount]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < stakeCount ? [...s, id] : s)
  }

  async function handleSteal(ids: string[]) {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/penalty/${battle.id}/steal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: ids }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erreur lors du transfert')
        return
      }
      toast.success(`🃏 Carte${ids.length > 1 ? 's' : ''} volée${ids.length > 1 ? 's' : ''} !`)
      router.push('/battles')
    } catch { toast.error('Erreur réseau') }
    finally { setLoading(false) }
  }

  if (!isWinner) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-16 h-16 rounded-full border-2 border-green-500/30 border-t-green-400" />
        <div className="text-center">
          <h2 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            MATCH TERMINÉ
          </h2>
          <p className="text-white/40">Le gagnant choisit sa récompense…</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="min-h-screen px-4 py-6 max-w-md mx-auto pb-28">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-black text-green-400 mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          CHOISIS TA RÉCOMPENSE ⚡
        </h2>
        <p className="text-white/40 text-sm">
          Vole <span className="text-green-400 font-bold">{stakeCount}</span> carte{stakeCount > 1 ? 's' : ''} parmi les picks de {them?.pseudo}
          {' '}· <span className="font-mono text-green-400">{countdown}s</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {loserPicks.map((card, i) => {
          const sel = selectedIds.includes(card.id)
          return (
            <motion.div key={card.id} whileTap={{ scale: 0.93 }}
              className={`rounded-2xl cursor-pointer transition-all relative ${sel ? 'ring-2 ring-green-400 scale-[1.03]' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => toggle(card.id)}>
              <GameCard card={card as unknown as Card} owned size="sm" selected={sel} onClick={() => {}} />
              {i === 3 && (
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded">GK</div>
              )}
              {sel && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <Star size={11} className="text-green-400 fill-green-400" />
                  <span className="text-green-400 text-[9px] font-black">SÉLECTIONNÉ</span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-md mx-auto">
        <motion.button whileTap={{ scale: 0.98 }}
          disabled={selectedIds.length !== stakeCount || loading}
          onClick={() => handleSteal(selectedIds)}
          className="w-full bg-green-500 disabled:opacity-30 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-xl shadow-green-500/25"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {loading ? 'Confirmation…' : `⚡ VOLER LA CARTE (${selectedIds.length}/${stakeCount})`}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── FinishedView ──────────────────────────────────────────────────────────────

function FinishedView({
  battle, currentUserId, challenger, opponent,
}: {
  battle: PenaltyBattle; currentUserId: string
  challenger: Profile | null; opponent: Profile | null
}) {
  const router = useRouter()
  const isChallenger = battle.challenger_id === currentUserId
  const iWon = battle.winner_id === currentUserId
  const myScore = isChallenger ? battle.challenger_score : battle.opponent_score
  const theirScore = isChallenger ? battle.opponent_score : battle.challenger_score
  const them = isChallenger ? opponent : challenger
  const stolenIds = battle.stolen_card_ids ?? []

  const relevantPicks = (battle.winner_id === battle.challenger_id
    ? battle.opponent_picks : battle.challenger_picks) as PickEntry[] | null
  const stolenCards = (relevantPicks ?? []).filter((c) => stolenIds.includes(c.id))

  const [revengeLoading, setRevengeLoading] = useState(false)

  async function startRevenge() {
    setRevengeLoading(true)
    try {
      const res = await fetch('/api/penalty/find', { method: 'POST' })
      const data = await res.json() as { battleId?: string }
      if (data.battleId) router.push(`/battles/penalty/${data.battleId}`)
      else router.push('/battles')
    } catch { router.push('/battles') }
    finally { setRevengeLoading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 py-6 gap-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
        className={`w-24 h-24 rounded-full flex items-center justify-center text-6xl ${iWon ? 'bg-green-500/15 shadow-[0_0_40px_#22c55e44]' : 'bg-red-500/15'}`}
      >
        {iWon ? '🏆' : '😔'}
      </motion.div>
      <div className="text-center">
        <motion.h1
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="text-6xl font-black mb-2"
          style={{ fontFamily: 'Bebas Neue, sans-serif', color: iWon ? '#22c55e' : '#ef4444' }}
        >
          {iWon ? 'VICTOIRE !' : 'DÉFAITE'}
        </motion.h1>
        <p className="text-4xl font-black text-white tabular-nums">{myScore} — {theirScore}</p>
        <p className="text-white/40 text-sm mt-1">vs {flag(them?.nation ?? '')} {them?.pseudo}</p>
      </div>

      {stolenCards.length > 0 && (
        <div className="text-center w-full max-w-sm">
          <p className={`text-xs uppercase tracking-widest mb-3 font-bold ${iWon ? 'text-green-400' : 'text-red-400'}`}>
            {iWon ? 'Cartes volées ⚡' : 'Cartes perdues 💔'}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {stolenCards.map((card) => (
              <div key={card.id} className="w-24">
                <GameCard card={card as unknown as Card} owned size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 w-full max-w-sm">
        <button onClick={() => router.push('/battles')}
          className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold text-sm">
          Retour
        </button>
        <button onClick={startRevenge} disabled={revengeLoading}
          className="flex-1 py-3 rounded-xl bg-green-500 text-black font-black text-sm disabled:opacity-50"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {revengeLoading ? '…' : '⚽ REVANCHE'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PenaltyClient({
  initialBattle, currentUserId, challenger, opponent,
  myCards, initialMyPicksSubmitted, initialMyChoice,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [battle, setBattle] = useState<PenaltyBattle>(initialBattle)
  const [pendingResult, setPendingResult] = useState<RoundResult | null>(null)

  const isChallenger = battle.challenger_id === currentUserId
  const myPicksSubmitted = isChallenger ? !!battle.challenger_picks : !!battle.opponent_picks

  // Track which rounds have been animated (never re-animate)
  const shownRoundsRef = useRef(new Set<number>())

  // Called by ActiveView when API returns resolved:true (faster path for 2nd submitter)
  const onRoundResolved = useCallback((result: RoundResult) => {
    if (shownRoundsRef.current.has(result.round)) return
    shownRoundsRef.current.add(result.round)
    setPendingResult(result)
  }, [])

  // Called by Realtime for the 1st submitter (who didn't get resolved:true from API)
  useEffect(() => {
    const rounds = (battle.rounds ?? []) as RoundResult[]
    for (const r of rounds) {
      if (!shownRoundsRef.current.has(r.round)) {
        shownRoundsRef.current.add(r.round)
        setPendingResult(r)
        break
      }
    }
  }, [battle.rounds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel(`penalty-${battle.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'penalty_battles', filter: `id=eq.${battle.id}`,
      }, ({ new: updated }) => {
        setBattle((prev) => ({ ...prev, ...(updated as Partial<PenaltyBattle>) }))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [battle.id, supabase])

  // Fallback polling
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/penalty/${battle.id}/state`)
        if (!r.ok) return
        const data = await r.json() as { battle?: PenaltyBattle }
        if (data.battle) setBattle((prev) => ({ ...prev, ...data.battle }))
      } catch {}
    }, 4000)
    return () => clearInterval(poll)
  }, [battle.id])

  // Compute updated scores for GoalAnimation
  const newCScore = pendingResult
    ? battle.challenger_score - (pendingResult.is_goal && pendingResult.shooter_id === battle.challenger_id ? 0 : 0)
    : battle.challenger_score
  const newOScore = pendingResult ? battle.opponent_score : battle.opponent_score

  // Actually scores in battle are already updated by the time Realtime fires
  // Pass them directly
  const displayCScore = battle.challenger_score
  const displayOScore = battle.opponent_score

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-950">
      {/* ScoreBoard (always visible when active/stealing) */}
      {(battle.status === 'active' || battle.status === 'stealing') && (
        <ScoreBoard
          battle={battle}
          currentUserId={currentUserId}
          challenger={challenger}
          opponent={opponent}
        />
      )}

      <AnimatePresence mode="wait">
        {battle.status === 'waiting' && (
          <WaitingView key="waiting" battle={battle} isChallenger={isChallenger} />
        )}
        {battle.status === 'picking' && (
          <PickingView
            key="picking"
            battle={battle}
            currentUserId={currentUserId}
            challenger={challenger}
            opponent={opponent}
            myCards={myCards}
            initialMyPicksSubmitted={initialMyPicksSubmitted || myPicksSubmitted}
          />
        )}
        {battle.status === 'active' && (
          <ActiveView
            key="active"
            battle={battle}
            currentUserId={currentUserId}
            challenger={challenger}
            opponent={opponent}
            initialMyChoice={initialMyChoice}
            onRoundResolved={onRoundResolved}
            isAnimating={!!pendingResult}
          />
        )}
        {battle.status === 'stealing' && (
          <StealingView
            key="stealing"
            battle={battle}
            currentUserId={currentUserId}
            challenger={challenger}
            opponent={opponent}
          />
        )}
        {battle.status === 'finished' && (
          <FinishedView
            key="finished"
            battle={battle}
            currentUserId={currentUserId}
            challenger={challenger}
            opponent={opponent}
          />
        )}
        {battle.status === 'cancelled' && (
          <motion.div key="cancelled" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="min-h-screen flex items-center justify-center text-white/40 text-lg">
            Battle annulée
          </motion.div>
        )}
      </AnimatePresence>

      {/* GoalAnimation overlay — at top level, above everything */}
      <AnimatePresence>
        {pendingResult && (
          <GoalAnimation
            key={`anim-${pendingResult.round}`}
            result={pendingResult}
            onDone={() => setPendingResult(null)}
            newCScore={displayCScore}
            newOScore={displayOScore}
            isChallenger={isChallenger}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
