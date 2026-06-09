'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { GameCard } from '@/components/ui/Card'
import { Trophy, X, ArrowLeft, Swords, Flame } from 'lucide-react'
import type { Card } from '@/types'

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾', Italy: '🇮🇹',
  USA: '🇺🇸', Mexico: '🇲🇽', Canada: '🇨🇦', Morocco: '🇲🇦',
}

const STAT_COLORS: Record<string, string> = {
  PAC: '#f59e0b', TIR: '#ef4444', PAS: '#3b82f6',
  DEF: '#22c55e', DRI: '#a855f7', PHY: '#f97316',
}

interface BattleRound {
  stat: string
  label: string
  challenger_val: number
  opponent_val: number
  winner: 'challenger' | 'opponent' | 'tie'
}

interface UserProfile {
  id: string
  pseudo: string
  nation: string
  photo_url: string | null
}

interface Battle {
  id: string
  challenger_id: string
  opponent_id: string
  coins_stake: number
  winner_id: string | null
  status: string
  rounds: BattleRound[] | null
  result_summary: string | null
  challenger: UserProfile | null
  opponent: UserProfile | null
  challenger_card: Card | null
  opponent_card: Card | null
}

interface Props {
  battle: Battle
  currentUserId: string
}

export function BattleRevealClient({ battle, currentUserId }: Props) {
  const [phase, setPhase] = useState<'intro' | 'round1' | 'round2' | 'round3' | 'result'>('intro')
  const [revealedRound, setRevealedRound] = useState<number | null>(null)
  const [countingUp, setCountingUp] = useState(false)
  const [challCount, setChallCount] = useState(0)
  const [oppCount, setOppCount] = useState(0)

  const isFinished = battle.status === 'finished'
  const rounds: BattleRound[] = battle.rounds ?? []
  const isChallenger = battle.challenger_id === currentUserId
  const iWon = battle.winner_id === currentUserId
  const currentRoundIdx = phase === 'round1' ? 0 : phase === 'round2' ? 1 : phase === 'round3' ? 2 : -1
  const currentRound = currentRoundIdx >= 0 ? rounds[currentRoundIdx] : null

  // Auto-advance phases for finished battles
  useEffect(() => {
    if (!isFinished || rounds.length === 0) return

    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setPhase('round1'), 1200))
    timers.push(setTimeout(() => setPhase('round2'), 4500))
    timers.push(setTimeout(() => setPhase('round3'), 7800))
    timers.push(setTimeout(() => setPhase('result'), 11000))
    return () => timers.forEach(clearTimeout)
  }, [isFinished, rounds.length])

  // Count-up animation when a round is revealed
  useEffect(() => {
    if (currentRoundIdx < 0 || !currentRound) return
    setRevealedRound(currentRoundIdx)
    setCountingUp(true)
    setChallCount(0)
    setOppCount(0)

    const target_c = currentRound.challenger_val
    const target_o = currentRound.opponent_val
    let frame = 0
    const total = 20
    const timer = setInterval(() => {
      frame++
      setChallCount(Math.round((frame / total) * target_c))
      setOppCount(Math.round((frame / total) * target_o))
      if (frame >= total) {
        setChallCount(target_c)
        setOppCount(target_o)
        setCountingUp(false)
        clearInterval(timer)
      }
    }, 40)
    return () => clearInterval(timer)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const challWins = rounds.filter((r) => r.winner === 'challenger').length
  const oppWins = rounds.filter((r) => r.winner === 'opponent').length

  const myProfile = isChallenger ? battle.challenger : battle.opponent
  const theirProfile = isChallenger ? battle.opponent : battle.challenger
  const myCard = isChallenger ? battle.challenger_card : battle.opponent_card
  const theirCard = isChallenger ? battle.opponent_card : battle.challenger_card

  // For the round display, challenger is always "left", opponent "right"
  const leftProfile = battle.challenger
  const rightProfile = battle.opponent
  const leftCard = battle.challenger_card
  const rightCard = battle.opponent_card

  const leftWins = challWins
  const rightWins = oppWins
  const leftIsCurrentUser = isChallenger

  const pendingMessage = battle.status === 'pending'
    ? isChallenger ? 'En attente de réponse...' : 'Tu dois accepter ce défi'
    : battle.status === 'declined' ? 'Défi refusé' : null

  if (!isFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 text-center max-w-sm">
          <Swords size={48} className="text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            BATTLE {battle.status === 'declined' ? 'REFUSÉ' : 'EN ATTENTE'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{pendingMessage}</p>
          <Link href="/battles" className="inline-flex items-center gap-2 text-[#F5C518] hover:underline text-sm font-semibold">
            <ArrowLeft size={14} /> Retour aux battles
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Back link */}
      <div className="px-4 pt-4">
        <Link href="/battles" className="inline-flex items-center gap-1 text-gray-500 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14} /> Battles
        </Link>
      </div>

      {/* Battle arena */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-8 pt-4 max-w-2xl mx-auto w-full">

        {/* Score header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full glass rounded-2xl p-4 mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="text-lg">{NATION_FLAGS[leftProfile?.nation ?? ''] ?? '🌍'}</div>
            <span className={`font-black text-sm ${leftIsCurrentUser ? 'text-[#F5C518]' : 'text-white'}`}>
              {leftProfile?.pseudo ?? '?'}
              {leftIsCurrentUser && <span className="text-xs ml-1 text-[#F5C518]/60">(toi)</span>}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={`lw-${leftWins}`}
                initial={{ scale: 1.6, color: '#F5C518' }}
                animate={{ scale: 1, color: phase === 'result' ? '#F5C518' : '#ffffff' }}
                className="text-3xl font-black"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {phase === 'intro' ? 0 : leftWins}
              </motion.span>
            </AnimatePresence>
            <span className="text-gray-600 font-black text-xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>VS</span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={`rw-${rightWins}`}
                initial={{ scale: 1.6, color: '#F5C518' }}
                animate={{ scale: 1, color: phase === 'result' ? '#F5C518' : '#ffffff' }}
                className="text-3xl font-black"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {phase === 'intro' ? 0 : rightWins}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <span className={`font-black text-sm ${!leftIsCurrentUser ? 'text-[#F5C518]' : 'text-white'}`}>
              {rightProfile?.pseudo ?? '?'}
              {!leftIsCurrentUser && <span className="text-xs ml-1 text-[#F5C518]/60">(toi)</span>}
            </span>
            <div className="text-lg">{NATION_FLAGS[rightProfile?.nation ?? ''] ?? '🌍'}</div>
          </div>
        </motion.div>

        {/* Cards face-off */}
        <div className="w-full flex items-center justify-between gap-4 mb-6">
          {/* Left card */}
          <motion.div
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-2"
          >
            {leftCard ? (
              <GameCard card={leftCard} owned size="md" />
            ) : (
              <div className="w-[150px] h-[210px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">?</div>
            )}
          </motion.div>

          {/* Center: stat reveal */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <AnimatePresence mode="wait">
              {phase === 'intro' && (
                <motion.div
                  key="intro"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="text-5xl"
                >
                  ⚔️
                </motion.div>
              )}

              {currentRound && phase !== 'result' && (
                <motion.div
                  key={phase}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="text-xs font-black px-3 py-1 rounded-full mb-1"
                    style={{
                      background: `${STAT_COLORS[currentRound.label] ?? '#888'}22`,
                      border: `1px solid ${STAT_COLORS[currentRound.label] ?? '#888'}55`,
                      color: STAT_COLORS[currentRound.label] ?? '#888',
                    }}
                  >
                    ROUND {currentRoundIdx + 1}
                  </div>
                  <div
                    className="text-2xl font-black"
                    style={{
                      color: STAT_COLORS[currentRound.label] ?? '#888',
                      fontFamily: 'Bebas Neue, sans-serif',
                    }}
                  >
                    {currentRound.label}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <motion.span
                      className={`text-xl font-black ${
                        currentRound.winner === 'challenger' ? 'text-green-400' : 'text-red-400'
                      }`}
                      style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                    >
                      {countingUp ? challCount : currentRound.challenger_val}
                    </motion.span>
                    <span className="text-gray-600 text-sm">vs</span>
                    <motion.span
                      className={`text-xl font-black ${
                        currentRound.winner === 'opponent' ? 'text-green-400' : 'text-red-400'
                      }`}
                      style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                    >
                      {countingUp ? oppCount : currentRound.opponent_val}
                    </motion.span>
                  </div>
                  {!countingUp && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`text-xs font-bold mt-1 ${
                        currentRound.winner === 'tie' ? 'text-gray-400' :
                        (currentRound.winner === 'challenger') === leftIsCurrentUser ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {currentRound.winner === 'tie' ? 'ÉGALITÉ'
                        : currentRound.winner === 'challenger' ? `${leftProfile?.pseudo} l'emporte`
                        : `${rightProfile?.pseudo} l'emporte`}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {phase === 'result' && (
                <motion.div
                  key="result"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center gap-2"
                >
                  {iWon ? (
                    <>
                      <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-5xl"
                      >
                        🏆
                      </motion.div>
                      <div className="text-green-400 font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                        +{battle.coins_stake} COINS
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl">💔</div>
                      <div className="text-red-400 font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                        -{battle.coins_stake} COINS
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right card */}
          <motion.div
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-2"
          >
            {rightCard ? (
              <GameCard card={rightCard} owned size="md" />
            ) : (
              <div className="w-[150px] h-[210px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">?</div>
            )}
          </motion.div>
        </div>

        {/* Round indicators */}
        {isFinished && rounds.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            {rounds.map((r, i) => {
              const shown = (phase === 'round1' && i <= 0) || (phase === 'round2' && i <= 1) || (phase === 'round3' && i <= 2) || phase === 'result'
              const roundWinner = r.winner === 'challenger' ? 'left' : r.winner === 'opponent' ? 'right' : 'tie'
              const iWonRound = (roundWinner === 'left' && leftIsCurrentUser) || (roundWinner === 'right' && !leftIsCurrentUser)
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0.2, scale: 0.8 }}
                  className={`flex flex-col items-center gap-1`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all"
                    style={{
                      borderColor: shown ? (STAT_COLORS[r.label] ?? '#888') : '#333',
                      background: shown ? `${STAT_COLORS[r.label] ?? '#888'}15` : 'transparent',
                      color: shown ? (STAT_COLORS[r.label] ?? '#888') : '#444',
                    }}
                  >
                    {r.label}
                  </div>
                  {shown && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-xs font-bold ${
                        r.winner === 'tie' ? 'text-gray-500' :
                        iWonRound ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {r.winner === 'tie' ? '=' : iWonRound ? '✓' : '✗'}
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Final result */}
        <AnimatePresence>
          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full"
            >
              <div className={`glass rounded-2xl p-6 text-center border ${
                iWon ? 'border-[#F5C518]/30' : 'border-red-500/20'
              }`}>
                {iWon ? (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Trophy className="text-[#F5C518]" size={24} />
                      <h2 className="text-3xl font-black text-[#F5C518]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                        VICTOIRE !
                      </h2>
                      <Trophy className="text-[#F5C518]" size={24} />
                    </div>
                    <p className="text-white font-bold mb-1">
                      Tu remportes <span className="text-[#F5C518]">{battle.coins_stake} coins</span>
                    </p>
                    {(isChallenger ? challWins : oppWins) === 3 && (
                      <div className="flex items-center justify-center gap-1 text-orange-400 text-sm font-bold mt-2">
                        <Flame size={14} /> Perfect — 3-0 !
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <X className="text-red-400" size={24} />
                      <h2 className="text-3xl font-black text-red-400" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                        DÉFAITE
                      </h2>
                    </div>
                    <p className="text-gray-400 mb-1">
                      Tu perds <span className="text-red-400">{battle.coins_stake} coins</span>
                    </p>
                    <p className="text-gray-600 text-xs mt-1">Relance un battle pour te venger !</p>
                  </>
                )}

                {/* Score detail */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center gap-6 text-sm text-gray-500">
                  <span>{leftProfile?.pseudo} {challWins}</span>
                  <span className="text-gray-700">—</span>
                  <span>{oppWins} {rightProfile?.pseudo}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Link
                  href="/battles/new"
                  className="flex-1 text-center bg-[#F5C518] text-black font-black py-3 rounded-xl hover:bg-[#ffd700] transition-all text-sm"
                  style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                >
                  <Swords size={14} className="inline mr-1" /> NOUVEAU BATTLE
                </Link>
                <Link
                  href="/battles"
                  className="flex-1 text-center border border-white/10 text-gray-400 hover:text-white py-3 rounded-xl transition-all text-sm font-semibold"
                >
                  Mes battles
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waiting animation for non-finished battle that the challenger sees */}
        {!isFinished && battle.status === 'pending' && isChallenger && (
          <div className="text-center py-8">
            <div className="text-gray-500 text-sm animate-pulse">En attente que {theirProfile?.pseudo} accepte...</div>
          </div>
        )}
      </div>
    </div>
  )
}
