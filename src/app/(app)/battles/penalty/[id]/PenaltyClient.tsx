'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Check, Star } from 'lucide-react'
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
    }, 1000)
    return () => clearInterval(t)
  }, [deadline])
  return timeLeft
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
        <button
          onClick={cancel}
          disabled={cancelling}
          className="text-white/30 hover:text-white/50 text-sm underline transition-colors disabled:opacity-50"
        >
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
  battle: PenaltyBattle
  currentUserId: string
  challenger: Profile | null
  opponent: Profile | null
  myCards: Card[]
  initialMyPicksSubmitted: boolean
}) {
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

  const timeLeft = useDeadlineCountdown(battle.picks_deadline)

  const sorted = useMemo(() =>
    [...myCards].sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))
  , [myCards])

  const gkCards = useMemo(() =>
    sorted.filter((c) => typeof c.stats?.position === 'string' && (c.stats.position as string).toUpperCase() === 'GK')
  , [sorted])

  useEffect(() => {
    if (timeLeft === 0 && !submitted && sorted.length >= 4) {
      const auto = sorted.slice(0, 4)
      submitPicks(auto.slice(0, 3), auto[3])
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
        <div>
          <p className="text-white/30 text-xs">{me?.pseudo} vs {them?.pseudo ?? '…'}</p>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            ⚽ CHOISIS TON ÉQUIPE
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
          <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
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
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!canSubmit || loading}
            onClick={() => canSubmit && selectedGK && submitPicks(selectedShooters, selectedGK)}
            className="w-full bg-green-500 disabled:opacity-30 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-xl shadow-green-500/20"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            {loading ? 'Confirmation…' : 'CONFIRMER MON ÉQUIPE ⚽'}
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

// ── ActiveView ────────────────────────────────────────────────────────────────

function ActiveView({
  battle, currentUserId, challenger, opponent, initialMyChoice,
}: {
  battle: PenaltyBattle
  currentUserId: string
  challenger: Profile | null
  opponent: Profile | null
  initialMyChoice: string | null
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
  const myActiveCard = (iAmShooter ? myPicks[shooterPickIdx] : myPicks[3]) as unknown as Card | undefined
  const theirActiveCard = (iAmShooter ? theirPicks[3] : theirPicks[shooterPickIdx]) as unknown as Card | undefined

  const timeLeft = useDeadlineCountdown(battle.round_deadline)
  const [myChoice, setMyChoice] = useState<string | null>(initialMyChoice)
  const [roundPhase, setRoundPhase] = useState<'choosing' | 'waiting'>(() => initialMyChoice ? 'waiting' : 'choosing')
  const [lastResult, setLastResult] = useState<RoundResult | null>(null)
  const [loading, setLoading] = useState(false)

  const usedPanenka = isChallenger ? battle.challenger_used_panenka : battle.opponent_used_panenka
  const flashShownRef = useRef(new Set<number>())

  useEffect(() => {
    const rounds = (battle.rounds ?? []) as RoundResult[]
    for (const r of rounds) {
      if (!flashShownRef.current.has(r.round)) {
        flashShownRef.current.add(r.round)
        setLastResult(r)
        setTimeout(() => {
          setLastResult(null)
          setMyChoice(null)
          setRoundPhase('choosing')
        }, 2500)
        break
      }
    }
  }, [battle.rounds]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (timeLeft === 0 && roundPhase === 'choosing' && !myChoice) {
      const choices = ['left', 'center', 'right'] as const
      submitChoice(choices[Math.floor(Math.random() * 3)])
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitChoice(choice: string) {
    if (loading || myChoice || roundPhase !== 'choosing') return
    setLoading(true)
    try {
      const res = await fetch(`/api/penalty/${battle.id}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      })
      const data = await res.json() as {
        submitted: boolean; resolved: boolean; isGoal?: boolean
        roundResult?: RoundResult; alreadySubmitted?: boolean; error?: string
      }
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setMyChoice(choice)
      setRoundPhase('waiting')

      if (data.resolved && data.roundResult) {
        const rn = data.roundResult.round
        if (!flashShownRef.current.has(rn)) {
          flashShownRef.current.add(rn)
          setLastResult(data.roundResult)
          setTimeout(() => {
            setLastResult(null)
            setMyChoice(null)
            setRoundPhase('choosing')
          }, 2500)
        }
      }
    } catch { toast.error('Erreur réseau') }
    finally { setLoading(false) }
  }

  const myScore = isChallenger ? battle.challenger_score : battle.opponent_score
  const theirScore = isChallenger ? battle.opponent_score : battle.challenger_score

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen px-4 py-4 max-w-2xl mx-auto">

      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white/30 text-xs">Round {round} · {iAmShooter ? 'Vous tirez' : 'Vous êtes gardien'}</p>
          <div className="text-4xl font-black text-white tabular-nums" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {myScore} <span className="text-white/30">—</span> {theirScore}
          </div>
          <p className="text-white/30 text-xs mt-0.5">
            {flag(me?.nation ?? '')} {me?.pseudo} vs {flag(them?.nation ?? '')} {them?.pseudo}
          </p>
        </div>
        <div className="flex flex-col items-center glass rounded-xl px-4 py-2">
          <Clock size={12} className="text-green-400" />
          <span className="text-2xl font-black font-mono text-green-400" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Active cards */}
      <div className="flex items-end gap-3 mb-6 justify-center">
        <div className="text-center">
          <p className="text-white/30 text-[9px] uppercase mb-1">
            {iAmShooter ? 'Tireur (vous)' : `Tireur (${them?.pseudo ?? '?'})`}
          </p>
          <div className="w-20">
            {(iAmShooter ? myActiveCard : theirActiveCard)
              ? <GameCard card={(iAmShooter ? myActiveCard : theirActiveCard)!} owned size="sm" />
              : <div className="aspect-[2/3] bg-white/5 rounded-xl flex items-center justify-center text-white/20 text-xl">⚽</div>}
          </div>
        </div>
        <div className="text-2xl pb-4">⚡</div>
        <div className="text-center">
          <p className="text-white/30 text-[9px] uppercase mb-1">
            {iAmShooter ? `Gardien (${them?.pseudo ?? '?'})` : 'Gardien (vous)'}
          </p>
          <div className="w-20">
            {(iAmShooter ? theirActiveCard : myActiveCard)
              ? <GameCard card={(iAmShooter ? theirActiveCard : myActiveCard)!} owned size="sm" />
              : <div className="aspect-[2/3] bg-white/5 rounded-xl flex items-center justify-center text-white/20 text-xl">🧤</div>}
          </div>
        </div>
      </div>

      {/* Result flash */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className={`text-center px-10 py-8 rounded-3xl border backdrop-blur-xl ${
              lastResult.is_goal ? 'bg-green-500/20 border-green-500/30' : 'bg-blue-500/20 border-blue-500/30'
            }`}>
              <div className="text-7xl mb-2">{lastResult.is_goal ? '⚽' : '🧤'}</div>
              <div className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                {lastResult.is_goal ? 'BUT !' : 'ARRÊT !'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Direction buttons */}
      <div className="space-y-3">
        <p className="text-white/40 text-sm text-center font-bold">
          {iAmShooter ? '⚽ Où viser ?' : '🧤 Où plonger ?'}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(['left', 'center', 'right'] as const).map((dir) => {
            const chosen = myChoice === dir
            const labels: Record<string, string> = { left: '← Gauche', center: '↑ Centre', right: 'Droite →' }
            return (
              <motion.button key={dir} whileTap={{ scale: 0.93 }}
                disabled={roundPhase !== 'choosing' || loading}
                onClick={() => submitChoice(dir)}
                className={`py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all ${
                  chosen ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
                    : roundPhase !== 'choosing' ? 'bg-white/5 text-white/20'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                {labels[dir]}
              </motion.button>
            )
          })}
        </div>

        {iAmShooter && !usedPanenka && (
          <motion.button whileTap={{ scale: 0.96 }}
            disabled={roundPhase !== 'choosing' || loading}
            onClick={() => submitChoice('panenka')}
            className={`w-full py-3 rounded-2xl font-black text-sm transition-all ${
              myChoice === 'panenka' ? 'bg-yellow-400 text-black'
                : roundPhase !== 'choosing' ? 'bg-white/5 text-white/20'
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/15'
            }`}
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            ⭐ PANENKA (usage unique)
          </motion.button>
        )}

        {roundPhase === 'waiting' && !lastResult && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-3 text-white/40 text-sm">
            En attente de l'adversaire…
          </motion.p>
        )}
      </div>

      {/* Round history */}
      {((battle.rounds?.length ?? 0) > 0) && (
        <div className="mt-6">
          <p className="text-white/20 text-[9px] uppercase tracking-widest mb-2">Historique</p>
          <div className="flex gap-2 flex-wrap">
            {((battle.rounds ?? []) as RoundResult[]).map((r, i) => {
              const iShot = r.shooter_id === currentUserId
              const positive = iShot ? r.is_goal : !r.is_goal
              return (
                <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${positive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {r.is_goal ? '⚽' : '🧤'}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── StealingView ──────────────────────────────────────────────────────────────

function StealingView({
  battle, currentUserId, challenger, opponent,
}: {
  battle: PenaltyBattle; currentUserId: string
  challenger: Profile | null; opponent: Profile | null
}) {
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: ids }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur') }
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
      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl ${iWon ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
        {iWon ? '🏆' : '😔'}
      </div>
      <div className="text-center">
        <h1 className="text-5xl font-black mb-2" style={{
          fontFamily: 'Bebas Neue, sans-serif', color: iWon ? '#22c55e' : '#ef4444',
        }}>
          {iWon ? 'VICTOIRE !' : 'DÉFAITE'}
        </h1>
        <p className="text-3xl font-black text-white tabular-nums">{myScore} — {theirScore}</p>
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

  const isChallenger = battle.challenger_id === currentUserId
  const myPicksSubmitted = isChallenger ? !!battle.challenger_picks : !!battle.opponent_picks

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

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/penalty/${battle.id}/state`)
        if (!r.ok) return
        const data = await r.json() as { battle?: PenaltyBattle }
        if (data.battle) setBattle((prev) => ({ ...prev, ...data.battle }))
      } catch {}
    }, 3000)
    return () => clearInterval(poll)
  }, [battle.id])

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-950">
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
    </div>
  )
}
