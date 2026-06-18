'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Swords, ChevronLeft, Zap } from 'lucide-react'
import type { DuelEvent } from '@/lib/duel-engine'

interface MatchResult {
  scoreA: number
  scoreB: number
  events: DuelEvent[]
  winner: number
}

interface TournamentData {
  id: string
  p0_id: string
  p0_pseudo: string; p0_nation: string
  p1_pseudo: string; p1_nation: string
  p2_pseudo: string; p2_nation: string
  p3_pseudo: string; p3_nation: string
  semi1: MatchResult
  semi2: MatchResult
  final: MatchResult
  winner_slot: number
  winner_id: string | null
  coins_won: number
}

const NATION_FLAGS: Record<string, string> = {
  France:'🇫🇷', Brazil:'🇧🇷', Argentina:'🇦🇷', England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain:'🇪🇸', Germany:'🇩🇪', Portugal:'🇵🇹', Netherlands:'🇳🇱',
  Morocco:'🇲🇦', USA:'🇺🇸', Mexico:'🇲🇽', Belgium:'🇧🇪',
  Japan:'🇯🇵', Senegal:'🇸🇳', Croatia:'🇭🇷', Uruguay:'🇺🇾',
  Colombia:'🇨🇴', Poland:'🇵🇱', 'South Korea':'🇰🇷', Cameroon:'🇨🇲',
  'Ivory Coast':'🇨🇮', Norway:'🇳🇴',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

// ── Match Card ──────────────────────────────────────────────────────────────────
function MatchCard({
  label,
  playerA, nationA, isUserA,
  playerB, nationB, isUserB,
  result, revealed, color,
}: {
  label: string
  playerA: string; nationA: string; isUserA: boolean
  playerB: string; nationB: string; isUserB: boolean
  result: MatchResult
  revealed: boolean
  color: string
}) {
  const topGoal = result.events.find((e) => e.type === 'goal')
  const isAWinner = revealed && result.scoreA > result.scoreB
  const isBWinner = revealed && result.scoreB > result.scoreA
  const isDraw    = revealed && result.scoreA === result.scoreB

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${color}30`, background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Label */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{label}</p>
      </div>

      {/* Players row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-3">
        {/* Player A */}
        <div className={`flex flex-col items-start gap-0.5 transition-opacity ${revealed && isBWinner && !isDraw ? 'opacity-35' : ''}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-white text-sm truncate max-w-[90px]"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.05rem' }}>
              {playerA}
            </span>
            {isUserA && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 font-bold uppercase flex-shrink-0">
                Toi
              </span>
            )}
          </div>
          <span className="text-white/35 text-xs">{flag(nationA)} {nationA}</span>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-0.5">
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div
                key="score"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="text-2xl font-black tabular-nums"
                style={{ fontFamily: 'Bebas Neue, sans-serif', color }}
              >
                {result.scoreA}–{result.scoreB}
              </motion.div>
            ) : (
              <motion.div
                key="hidden"
                className="text-2xl font-black tabular-nums text-white/20"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                ?–?
              </motion.div>
            )}
          </AnimatePresence>
          {revealed && topGoal && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-white/30 truncate max-w-[80px] text-center"
            >
              ⚽ {topGoal.playerName}
            </motion.p>
          )}
        </div>

        {/* Player B */}
        <div className={`flex flex-col items-end gap-0.5 transition-opacity ${revealed && isAWinner && !isDraw ? 'opacity-35' : ''}`}>
          <div className="flex items-center gap-1.5 justify-end flex-wrap">
            {isUserB && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 font-bold uppercase flex-shrink-0">
                Toi
              </span>
            )}
            <span className="font-black text-white text-sm truncate max-w-[90px]"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.05rem' }}>
              {playerB}
            </span>
          </div>
          <span className="text-white/35 text-xs">{nationB} {flag(nationB)}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Winner Slot ─────────────────────────────────────────────────────────────────
function WinnerSlot({ pseudo, nation, isUser, revealed }: {
  pseudo: string; nation: string; isUser: boolean; revealed: boolean
}) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
      revealed
        ? isUser
          ? 'border-yellow-500/50 bg-yellow-500/10'
          : 'border-white/15 bg-white/5'
        : 'border-white/8 bg-white/3'
    }`}>
      <AnimatePresence mode="wait">
        {revealed ? (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5"
          >
            <span className="font-black text-white text-sm truncate max-w-[100px]"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {flag(nation)} {pseudo}
            </span>
            {isUser && <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/25 text-yellow-400 font-bold">Toi</span>}
          </motion.div>
        ) : (
          <motion.p key="tbd" className="text-white/25 text-xs font-bold">À déterminer…</motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────────
export function TournamentClient({ tournament: t, currentUserId }: {
  tournament: TournamentData
  currentUserId: string
}) {
  const router = useRouter()
  const [phase, setPhase] = useState(0)
  const [skipped, setSkipped] = useState(false)

  const DELAYS = [1200, 2800, 4400, 6000, 7600]

  useEffect(() => {
    if (skipped) return
    const timers = DELAYS.map((delay, i) =>
      setTimeout(() => setPhase(i + 1), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [skipped]) // eslint-disable-line react-hooks/exhaustive-deps

  function skipAnimation() {
    setSkipped(true)
    setPhase(5)
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const players = [
    { pseudo: t.p0_pseudo, nation: t.p0_nation, isUser: true },
    { pseudo: t.p1_pseudo, nation: t.p1_nation, isUser: false },
    { pseudo: t.p2_pseudo, nation: t.p2_nation, isUser: false },
    { pseudo: t.p3_pseudo, nation: t.p3_nation, isUser: false },
  ]

  const s1Winner = t.semi1.winner  // 0 or 1
  const s2Winner = t.semi2.winner  // 2 or 3
  const fWinner  = t.final.winner  // 0,1,2 or 3

  const finalist1 = players[s1Winner]
  const finalist2 = players[s2Winner]
  const champion  = players[fWinner]

  const isUserChamp     = fWinner === 0
  const isUserFinalist  = s1Winner === 0 && fWinner !== 0

  return (
    <div className="min-h-screen pb-28 px-4 max-w-lg mx-auto py-6">

      {/* Back */}
      <button onClick={() => router.push('/battles')} className="flex items-center gap-2 text-white/40 text-sm mb-6 hover:text-white/70 transition-colors">
        <ChevronLeft size={16} /> Battles
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-0.5">WorldSquad</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/15 flex items-center justify-center">
              <Trophy size={22} className="text-yellow-400" />
            </div>
            <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              TOURNOI
            </h1>
          </div>
        </div>
        {phase < 5 && (
          <button
            onClick={skipAnimation}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-white/30 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            <Zap size={11} /> Skip
          </button>
        )}
      </div>

      {/* Bracket */}
      <div className="space-y-4">

        {/* ── SEMI-FINALES ── */}
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/30 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2"
          >
            <Swords size={11} /> Demi-finales
          </motion.p>
          <div className="space-y-3">
            <MatchCard
              label="Demi-finale 1"
              playerA={players[0].pseudo} nationA={players[0].nation} isUserA
              playerB={players[1].pseudo} nationB={players[1].nation} isUserB={false}
              result={t.semi1}
              revealed={phase >= 1}
              color="#F5C518"
            />
            <MatchCard
              label="Demi-finale 2"
              playerA={players[2].pseudo} nationA={players[2].nation} isUserA={false}
              playerB={players[3].pseudo} nationB={players[3].nation} isUserB={false}
              result={t.semi2}
              revealed={phase >= 2}
              color="#a855f7"
            />
          </div>
        </div>

        {/* ── Arrow ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-1 py-1"
        >
          <div className="flex items-center gap-8">
            <WinnerSlot pseudo={finalist1.pseudo} nation={finalist1.nation} isUser={finalist1.isUser} revealed={phase >= 1} />
            <p className="text-white/20 text-xs font-bold">VS</p>
            <WinnerSlot pseudo={finalist2.pseudo} nation={finalist2.nation} isUser={finalist2.isUser} revealed={phase >= 2} />
          </div>
          {phase >= 3 && (
            <motion.div initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }}
              className="w-px h-6 bg-gradient-to-b from-orange-500/50 to-transparent" />
          )}
        </motion.div>

        {/* ── FINALE ── */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={12} className="text-orange-400" />
                <p className="text-orange-400 text-[10px] uppercase tracking-widest font-bold">Finale</p>
              </div>
              <MatchCard
                label="FINALE 🏆"
                playerA={finalist1.pseudo} nationA={finalist1.nation} isUserA={finalist1.isUser}
                playerB={finalist2.pseudo} nationB={finalist2.nation} isUserB={finalist2.isUser}
                result={t.final}
                revealed={phase >= 4}
                color="#f97316"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CHAMPION ── */}
        <AnimatePresence>
          {phase >= 5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="mt-4 rounded-2xl border overflow-hidden relative"
              style={{
                borderColor: isUserChamp ? 'rgba(245,197,24,0.5)' : 'rgba(255,255,255,0.15)',
                background: isUserChamp
                  ? 'linear-gradient(135deg, rgba(245,197,24,0.12) 0%, rgba(245,197,24,0.04) 100%)'
                  : 'rgba(255,255,255,0.04)',
                boxShadow: isUserChamp ? '0 0 60px rgba(245,197,24,0.25)' : undefined,
              }}
            >
              {/* Glow pulse */}
              {isUserChamp && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  style={{ background: 'radial-gradient(ellipse at center, rgba(245,197,24,0.15) 0%, transparent 70%)' }}
                />
              )}

              <div className="relative p-6 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 18, delay: 0.15 }}
                  className="text-5xl mb-3"
                >
                  🏆
                </motion.div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Champion</p>
                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-4xl font-black text-white mb-1"
                  style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                >
                  {flag(champion.nation)} {champion.pseudo}
                </motion.h2>
                {isUserChamp && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/50 text-sm"
                  >
                    Félicitations ! Tu as remporté le tournoi 🎉
                  </motion.p>
                )}
              </div>

              {/* Coins badge */}
              {t.coins_won > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative px-6 pb-5 text-center"
                >
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                    <span className="text-yellow-400 font-black text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                      +{t.coins_won} COINS
                    </span>
                    <span className="text-xl">🪙</span>
                  </div>
                  <p className="text-white/30 text-xs mt-2">
                    {isUserChamp ? '🏆 1ère place' : '🥈 2ème place — finaliste'}
                  </p>
                </motion.div>
              )}

              {t.coins_won === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="relative px-6 pb-4 text-center"
                >
                  <p className="text-white/25 text-xs">Éliminé en demi-finale — rejoue pour gagner des coins !</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <AnimatePresence>
        {phase >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 space-y-3"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/battles')}
              className="w-full py-4 rounded-2xl font-black text-black transition-all"
              style={{
                background: '#F5C518',
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: '1.1rem',
                boxShadow: '0 0 30px rgba(245,197,24,0.3)',
              }}
            >
              🏆 REJOUER UN TOURNOI
            </motion.button>
            <button
              onClick={() => router.push('/battles')}
              className="w-full py-3 rounded-2xl text-white/40 text-sm font-bold hover:text-white/60 transition-colors"
            >
              Retour aux Battles
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
