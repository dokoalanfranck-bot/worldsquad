'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, ChevronUp, Star, Trophy, X, Clock, RotateCcw } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile { id: string; pseudo: string; photo_url: string | null; nation: string }
interface CardDef {
  id: string; name: string; rarity: string; image_url: string | null
  stats: Record<string, number | string>; type: string
}
interface WagerCard { id: string; card_id: string; card: CardDef }
interface ResolvedRound {
  round: number; shooter_id: string; gk_id: string
  shooter_choice: string; gk_choice: string; is_goal: boolean
  shooter_power: number; gk_power: number
}
interface Battle {
  id: string; challenger_id: string; opponent_id: string | null; status: string
  current_round: number; challenger_score: number; opponent_score: number
  rounds: ResolvedRound[]; round_deadline: string | null
  challenger_used_panenka: boolean; opponent_used_panenka: boolean
  winner_id: string | null; challenger_wager: string | null; opponent_wager: string | null
}

type Direction = 'left' | 'center' | 'right' | 'panenka'
type RoundPhase = 'choosing' | 'waiting' | 'result'

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Cameroon: '🇨🇲',
  Senegal: '🇸🇳', Belgium: '🇧🇪', Japan: '🇯🇵', Uruguay: '🇺🇾',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

const RARITY_GLOW: Record<string, string> = {
  Legend: 'shadow-[0_0_24px_rgba(245,197,24,0.6)]',
  Epic: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
  Rare: 'shadow-[0_0_16px_rgba(59,130,246,0.4)]',
  Common: '',
}

function isShooterThisRound(round: number, userId: string, challengerId: string): boolean {
  return round % 2 === 1 ? userId === challengerId : userId !== challengerId
}

// ─── Card Mini ─────────────────────────────────────────────────────────────

function CardMini({ card, label }: { card: WagerCard | null; label: string }) {
  if (!card) return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-14 h-20 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
        <Star size={18} className="text-white/20" />
      </div>
      <p className="text-white/30 text-[10px]">{label}</p>
    </div>
  )
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-14 h-20 rounded-lg overflow-hidden border border-white/10 ${RARITY_GLOW[card.card.rarity] ?? ''}`}>
        {card.card.image_url
          ? <Image src={card.card.image_url} alt={card.card.name} width={56} height={80} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
              <span className="text-white/30 text-xs font-bold">{card.card.name.slice(0, 2).toUpperCase()}</span>
            </div>
        }
      </div>
      <p className="text-white/50 text-[10px] text-center leading-tight max-w-[56px] truncate">{card.card.name}</p>
    </div>
  )
}

// ─── Round History Dots ─────────────────────────────────────────────────────

function RoundDots({ rounds, total, challengerId }: { rounds: ResolvedRound[]; total: number; challengerId: string }) {
  const pairs: Array<[ResolvedRound | null, ResolvedRound | null]> = []
  for (let i = 0; i < total; i += 2) {
    pairs.push([rounds[i] ?? null, rounds[i + 1] ?? null])
  }
  return (
    <div className="flex gap-3 justify-center">
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex flex-col gap-1 items-center">
          {pair.map((r, ri) => {
            const roundNum = idx * 2 + ri + 1
            const isChallenger = roundNum % 2 === 1
            if (!r) return <div key={ri} className="w-3 h-3 rounded-full bg-white/10 border border-white/20" />
            const goal = r.is_goal
            const color = isChallenger
              ? goal ? 'bg-green-500' : 'bg-red-500'
              : goal ? 'bg-red-500' : 'bg-green-500'
            return (
              <motion.div
                key={ri}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-3 h-3 rounded-full ${color}`}
                title={`Tour ${roundNum}: ${goal ? 'But' : 'Arrêt'}`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Direction Buttons ──────────────────────────────────────────────────────

function DirectionButtons({
  isShooter,
  onChoose,
  disabled,
  usedPanenka,
}: {
  isShooter: boolean
  onChoose: (d: Direction) => void
  disabled: boolean
  usedPanenka: boolean
}) {
  const dirs: { dir: Direction; label: string; icon: React.ReactNode }[] = [
    { dir: 'left', label: 'GAUCHE', icon: <ArrowLeft size={20} /> },
    { dir: 'center', label: 'CENTRE', icon: <ChevronUp size={20} /> },
    { dir: 'right', label: 'DROITE', icon: <ArrowRight size={20} /> },
  ]

  return (
    <div className="space-y-3">
      <p className="text-center text-white/40 text-xs uppercase tracking-widest">
        {isShooter ? 'Où tirez-vous ?' : 'De quel côté plongez-vous ?'}
      </p>
      <div className="flex gap-3">
        {dirs.map(({ dir, label, icon }) => (
          <motion.button
            key={dir}
            whileTap={{ scale: 0.93 }}
            onClick={() => onChoose(dir)}
            disabled={disabled}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-40"
          >
            <span className="text-white">{icon}</span>
            <span className="text-white font-black text-xs tracking-wider">{label}</span>
          </motion.button>
        ))}
      </div>
      {isShooter && !usedPanenka && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onChoose('panenka')}
          disabled={disabled}
          className="w-full py-3 rounded-2xl border border-[#F5C518]/40 bg-[#F5C518]/10 text-[#F5C518] font-black text-sm tracking-widest hover:bg-[#F5C518]/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Star size={15} fill="currentColor" />
          PANENKA ×1
        </motion.button>
      )}
    </div>
  )
}

// ─── Result Flash ───────────────────────────────────────────────────────────

function ResultFlash({ round, challengerId }: { round: ResolvedRound; challengerId: string }) {
  const shooterIsChallenger = round.shooter_id === challengerId
  const dirLabel = (d: string) => d === 'left' ? '← GAUCHE' : d === 'right' ? 'DROITE →' : d === 'center' ? '↑ CENTRE' : '⭐ PANENKA'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 rounded-2xl"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center space-y-3"
      >
        <div className={`text-6xl font-black ${round.is_goal ? 'text-green-400' : 'text-red-400'}`}
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {round.is_goal ? '⚽ BUT !' : '🧤 ARRÊT !'}
        </div>
        <div className="flex items-center gap-4 text-sm text-white/60">
          <span>Tireur: {dirLabel(round.shooter_choice)}</span>
          <span className="text-white/20">·</span>
          <span>Gardien: {dirLabel(round.gk_choice)}</span>
        </div>
        <p className="text-white/30 text-xs">Prochain tir dans un instant…</p>
      </motion.div>
    </motion.div>
  )
}

// ─── Countdown Bar ──────────────────────────────────────────────────────────

function CountdownBar({ deadline }: { deadline: string | null }) {
  const [remaining, setRemaining] = useState(5)

  useEffect(() => {
    if (!deadline) return
    const end = new Date(deadline).getTime()
    const tick = () => {
      const diff = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setRemaining(diff)
    }
    tick()
    const timer = setInterval(tick, 200)
    return () => clearInterval(timer)
  }, [deadline])

  const pct = Math.max(0, (remaining / 5) * 100)
  const color = remaining <= 1 ? 'bg-red-500' : remaining <= 2 ? 'bg-orange-400' : 'bg-green-400'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white/40">
        <span className="flex items-center gap-1"><Clock size={10} /> {remaining}s</span>
        <span>Choix automatique si timeout</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color} transition-colors`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PenaltyClient({
  initialBattle,
  currentUserId,
  challenger,
  opponent,
  challengerCard,
  opponentCard,
  initialMyChoice,
}: {
  initialBattle: Battle
  currentUserId: string
  challenger: Profile | null
  opponent: Profile | null
  challengerCard: WagerCard | null
  opponentCard: WagerCard | null
  initialMyChoice: string | null
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [battle, setBattle] = useState<Battle>(initialBattle)
  const [myChoice, setMyChoice] = useState<string | null>(initialMyChoice)
  const [roundPhase, setRoundPhase] = useState<RoundPhase>(initialMyChoice ? 'waiting' : 'choosing')
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isChallenger = currentUserId === battle.challenger_id
  const me = isChallenger ? challenger : opponent
  const them = isChallenger ? opponent : challenger
  const myCard = isChallenger ? challengerCard : opponentCard
  const theirCard = isChallenger ? opponentCard : challengerCard
  const myScore = isChallenger ? battle.challenger_score : battle.opponent_score
  const theirScore = isChallenger ? battle.opponent_score : battle.challenger_score
  const iAmShooter = isShooterThisRound(battle.current_round, currentUserId, battle.challenger_id)
  const usedPanenka = isChallenger ? battle.challenger_used_panenka : battle.opponent_used_panenka

  const roundLabel = battle.current_round <= 6
    ? `Tir ${Math.ceil(battle.current_round / 2)}/3 — ${battle.current_round % 2 === 1 ? (isChallenger ? 'mon tir' : 'leur tir') : (isChallenger ? 'leur tir' : 'mon tir')}`
    : `Mort subite — Tour ${battle.current_round - 6}`

  // Supabase Realtime — subscribe to battle updates
  useEffect(() => {
    const channel = supabase
      .channel(`penalty:${battle.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'penalty_battles', filter: `id=eq.${battle.id}` },
        (payload) => {
          const updated = payload.new as Battle
          setBattle(updated)

          if (updated.status === 'finished') {
            setRoundPhase('choosing')
            return
          }

          // New round started: show result of last round, then reset
          const lastRound = (updated.rounds as ResolvedRound[])[updated.rounds.length - 1]
          if (lastRound && updated.current_round > battle.current_round) {
            setRoundPhase('result')
            setMyChoice(null)
            if (resultTimerRef.current) clearTimeout(resultTimerRef.current)
            resultTimerRef.current = setTimeout(() => {
              setRoundPhase('choosing')
            }, 2500)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current)
    }
  }, [supabase, battle.id, battle.current_round])

  // Auto-submit if deadline passed and still in choosing phase
  useEffect(() => {
    if (roundPhase !== 'choosing' || !battle.round_deadline || battle.status !== 'active') return
    const deadline = new Date(battle.round_deadline).getTime()
    const now = Date.now()
    if (now < deadline) return

    const dirs: Direction[] = ['left', 'center', 'right']
    const random = dirs[Math.floor(Math.random() * 3)]
    handleChoose(random)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.round_deadline, roundPhase])

  const handleChoose = useCallback(async (dir: Direction) => {
    if (submitting || roundPhase !== 'choosing') return
    setSubmitting(true)
    setMyChoice(dir)
    setRoundPhase('waiting')
    try {
      const res = await fetch(`/api/penalty/${battle.id}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: dir }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erreur')
        setMyChoice(null)
        setRoundPhase('choosing')
      }
    } catch {
      toast.error('Erreur réseau')
      setMyChoice(null)
      setRoundPhase('choosing')
    } finally {
      setSubmitting(false)
    }
  }, [battle.id, submitting, roundPhase])

  async function handleCancel() {
    setCancelling(true)
    await fetch(`/api/penalty/${battle.id}/cancel`, { method: 'POST' })
    router.push('/battles')
  }

  const lastResolvedRound = battle.rounds.length > 0
    ? battle.rounds[battle.rounds.length - 1]
    : null

  // ── WAITING SCREEN ─────────────────────────────────────────────────────────
  if (battle.status === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="glass rounded-3xl border border-white/5 p-8 max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-green-500/15 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚽</span>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              TIRS AU BUT
            </h1>
            <p className="text-white/40 text-sm mt-1">En attente d'un adversaire…</p>
          </div>
          <div className="flex justify-center">
            <div className="flex gap-2 items-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-green-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, delay: i * 0.4, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 space-y-3">
            <p className="text-white/40 text-xs uppercase tracking-widest">Votre mise</p>
            <CardMini card={myCard} label={me?.pseudo ?? '?'} />
          </div>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  // ── FINISHED SCREEN ─────────────────────────────────────────────────────────
  if (battle.status === 'finished') {
    const iWon = battle.winner_id === currentUserId
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl border border-white/5 p-8 max-w-sm w-full text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto ${iWon ? 'bg-yellow-500/20' : 'bg-red-500/10'}`}
          >
            {iWon ? <Trophy size={36} className="text-yellow-400" /> : <X size={36} className="text-red-400" />}
          </motion.div>

          <div>
            <h2 className={`text-5xl font-black ${iWon ? 'text-yellow-400' : 'text-red-400'}`}
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {iWon ? 'VICTOIRE !' : 'DÉFAITE'}
            </h2>
            <p className="text-white/40 text-sm mt-1">
              {iWon
                ? `Tu remportes la carte de ${them?.pseudo} !`
                : `${them?.pseudo} remporte ta carte.`}
            </p>
          </div>

          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                {myScore}
              </p>
              <p className="text-white/40 text-xs mt-1">{me?.pseudo}</p>
            </div>
            <p className="text-white/20 text-3xl font-black">-</p>
            <div className="text-center">
              <p className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                {theirScore}
              </p>
              <p className="text-white/40 text-xs mt-1">{them?.pseudo ?? '?'}</p>
            </div>
          </div>

          {/* Cards won/lost */}
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <CardMini card={myCard} label="Ta carte" />
              {!iWon && <p className="text-red-400 text-[10px] mt-1">PERDUE</p>}
            </div>
            <div className="text-center">
              <CardMini card={theirCard} label="Carte adverse" />
              {iWon && <p className="text-green-400 text-[10px] mt-1">GAGNÉE</p>}
            </div>
          </div>

          {/* Rounds recap */}
          <div className="space-y-2">
            <p className="text-white/30 text-[10px] uppercase tracking-widest">Récapitulatif</p>
            <RoundDots rounds={battle.rounds} total={6} challengerId={battle.challenger_id} />
          </div>

          <button
            onClick={() => router.push('/battles')}
            className="w-full py-3 rounded-xl bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-colors"
          >
            Retour aux batailles
          </button>
        </motion.div>
      </div>
    )
  }

  // ── ACTIVE GAME ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto space-y-4 pb-28">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/battles')} className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white">
          <X size={18} />
        </button>
        <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          ⚽ TIRS AU BUT
        </h1>
        <div className="w-9" />
      </div>

      {/* Scoreboard */}
      <div className="glass rounded-2xl border border-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              {me?.photo_url
                ? <Image src={me.photo_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/40">{me?.pseudo?.[0]?.toUpperCase()}</div>
              }
              <p className="text-white text-sm font-bold truncate max-w-[80px]">{me?.pseudo}</p>
            </div>
            <motion.p
              key={myScore}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-white"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {myScore}
            </motion.p>
          </div>

          <div className="px-4 text-center">
            <p className="text-white/20 text-2xl font-black">—</p>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">{roundLabel}</p>
          </div>

          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <p className="text-white text-sm font-bold truncate max-w-[80px]">{them?.pseudo ?? '…'}</p>
              {them?.photo_url
                ? <Image src={them.photo_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/40">{them?.pseudo?.[0]?.toUpperCase()}</div>
              }
            </div>
            <motion.p
              key={theirScore}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-white"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {theirScore}
            </motion.p>
          </div>
        </div>

        {/* Round dots */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <RoundDots rounds={battle.rounds} total={6} challengerId={battle.challenger_id} />
        </div>
      </div>

      {/* Cards at stake */}
      <div className="glass rounded-2xl border border-white/5 p-4">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3 text-center">Cartes en jeu</p>
        <div className="flex justify-around">
          <CardMini card={myCard} label={`${flag(me?.nation ?? '')} ${me?.pseudo ?? '?'}`} />
          <div className="flex items-center text-white/20 text-lg font-black">VS</div>
          <CardMini card={theirCard} label={`${flag(them?.nation ?? '')} ${them?.pseudo ?? '?'}`} />
        </div>
      </div>

      {/* Role indicator */}
      <div className={`rounded-2xl p-3 text-center border ${iAmShooter ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
        <p className={`text-sm font-bold ${iAmShooter ? 'text-green-400' : 'text-blue-400'}`}>
          {iAmShooter ? '⚽ C\'est ton tir !' : '🧤 Tu es gardien !'}
        </p>
      </div>

      {/* Game area */}
      <div className="glass rounded-2xl border border-white/5 p-5 relative overflow-hidden" style={{ minHeight: 220 }}>
        <AnimatePresence mode="wait">
          {roundPhase === 'result' && lastResolvedRound ? (
            <ResultFlash key="result" round={lastResolvedRound} challengerId={battle.challenger_id} />
          ) : roundPhase === 'waiting' ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full space-y-4 py-8"
            >
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/40"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }}
                  />
                ))}
              </div>
              <p className="text-white/40 text-sm text-center">
                {myChoice && (
                  <span className="block text-white/60 font-medium mb-1">
                    Choix envoyé : {myChoice === 'left' ? '← GAUCHE' : myChoice === 'right' ? 'DROITE →' : myChoice === 'center' ? '↑ CENTRE' : '⭐ PANENKA'}
                  </span>
                )}
                En attente de l'adversaire…
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="choosing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <DirectionButtons
                isShooter={iAmShooter}
                onChoose={handleChoose}
                disabled={submitting}
                usedPanenka={usedPanenka}
              />
              <CountdownBar deadline={battle.round_deadline} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Forfeit button */}
      {battle.status === 'active' && roundPhase === 'choosing' && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-white/30 text-xs hover:bg-white/10 hover:text-white/50 transition-colors"
        >
          <RotateCcw size={12} />
          Abandonner la partie
        </button>
      )}
    </div>
  )
}
