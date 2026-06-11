'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Trophy } from 'lucide-react'
import type { Card } from '@/types'
import type { MatchEvent } from '@/lib/battle-engine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Battle = Record<string, any>

interface Props {
  battle: Battle
  currentUserId: string
}

const MATCH_DURATION = 20000  // 20 secondes

// Positions sur le terrain SVG (viewBox 0 0 100 60)
const HOME_POSITIONS = [
  { x: 28, y: 18 },
  { x: 22, y: 30 },
  { x: 28, y: 42 },
]
const AWAY_POSITIONS = [
  { x: 72, y: 18 },
  { x: 78, y: 30 },
  { x: 72, y: 42 },
]

function initials(name: string) {
  const parts = name.split(' ')
  return parts.length > 1
    ? parts[parts.length - 1].charAt(0).toUpperCase()
    : name.charAt(0).toUpperCase()
}

// Interpolation linéaire
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

// Position du ballon selon le temps écoulé et les événements
function computeBallPos(elapsed: number, events: MatchEvent[]) {
  let bx = 50 + Math.sin(elapsed * 0.0015) * 10
  let by = 30 + Math.sin(elapsed * 0.0025 + 1) * 7

  for (const evt of events) {
    const diff = elapsed - evt.timeMs

    if (diff < -1500 || diff > 2500) continue

    const scorerX = evt.team === 'home' ? 28 : 72
    const scorerY = 30
    const goalX = evt.team === 'home' ? 97 : 3
    const goalY = 30

    if (diff < 0) {
      // Approche du buteur
      const t = (diff + 1500) / 1500
      bx = lerp(bx, scorerX, t * 0.6)
      by = lerp(by, scorerY, t * 0.6)
    } else if (diff < 800) {
      // Tir vers le but
      const t = diff / 800
      bx = lerp(scorerX, goalX, t)
      by = lerp(scorerY, goalY, t)
    } else {
      // Retour au centre
      const t = Math.min(1, (diff - 800) / 1500)
      bx = lerp(goalX, 50, t)
      by = lerp(goalY, 30, t)
    }
    break
  }

  return { bx, by }
}

export function MatchAnimationClient({ battle, currentUserId }: Props) {
  const isChallenger = battle.challenger_id === currentUserId
  const challenger = battle.challenger as { pseudo: string; nation: string }
  const opponent = battle.opponent as { pseudo: string; nation: string }

  const challengerTeam = battle.challenger_team as { players: Card[]; coach: Card } | null
  const opponentTeam = battle.opponent_team as { players: Card[]; coach: Card } | null
  const events = (battle.match_events ?? []) as MatchEvent[]
  const finalScore = battle.final_score as { home: number; away: number } | null
  const matchStartAt = battle.match_start_at ? new Date(battle.match_start_at).getTime() : null
  const challengerCohesion = battle.challenger_cohesion as number ?? 0
  const opponentCohesion = battle.opponent_cohesion as number ?? 0

  const homePlayers = challengerTeam?.players ?? []
  const awayPlayers = opponentTeam?.players ?? []

  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState({ home: 0, away: 0 })
  const [goalFlash, setGoalFlash] = useState<{ team: 'home' | 'away'; player: string } | null>(null)
  const [ballPos, setBallPos] = useState({ bx: 50, by: 30 })
  const [finished, setFinished] = useState(false)
  const [finishCalled, setFinishCalled] = useState(false)

  const firedEvents = useRef(new Set<number>())
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const finishMatch = useCallback(async () => {
    if (finishCalled) return
    setFinishCalled(true)
    try {
      await fetch(`/api/battles/${battle.id}/finish-match`, { method: 'POST' })
    } catch { /* non bloquant */ }
  }, [battle.id, finishCalled])

  useEffect(() => {
    // Attendre match_start_at pour une synchronisation parfaite
    const now = Date.now()
    const startDelay = matchStartAt ? Math.max(0, matchStartAt - now) : 0

    const timer = setTimeout(() => {
      const actualStart = Date.now()
      startTimeRef.current = actualStart

      const tick = () => {
        const e = Date.now() - actualStart
        const clamped = Math.min(e, MATCH_DURATION)
        setElapsed(clamped)
        setBallPos(computeBallPos(clamped, events))

        // Déclencher les événements but
        for (const evt of events) {
          if (!firedEvents.current.has(evt.timeMs) && clamped >= evt.timeMs) {
            firedEvents.current.add(evt.timeMs)
            setScore((s) => ({
              ...s,
              [evt.team === 'home' ? 'home' : 'away']: s[evt.team === 'home' ? 'home' : 'away'] + 1,
            }))
            setGoalFlash({ team: evt.team, player: evt.playerName })
            setTimeout(() => setGoalFlash(null), 2000)
          }
        }

        if (e < MATCH_DURATION + 1000) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setFinished(true)
          finishMatch()
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }, startDelay)

    return () => {
      clearTimeout(timer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [events, matchStartAt, finishMatch])

  const minute = Math.round((elapsed / MATCH_DURATION) * 90)
  const timeLeft = Math.max(0, MATCH_DURATION - elapsed)
  const progressPct = (elapsed / MATCH_DURATION) * 100

  const iWon = battle.winner_id === currentUserId
  const isDraw = !battle.winner_id

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto flex flex-col gap-4">
      {/* Scoreboard */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          {/* Home (challenger) */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <p className="text-xs font-bold text-blue-400 truncate max-w-[80px] text-center">{challenger?.pseudo}</p>
            <div className="text-xs text-gray-600">Cohésion {challengerCohesion}</div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 mx-4">
            <motion.span
              key={score.home}
              initial={{ scale: 1.8, color: '#3b82f6' }}
              animate={{ scale: 1, color: '#ffffff' }}
              className="text-4xl font-black"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {score.home}
            </motion.span>
            <span className="text-gray-600 font-black text-2xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>—</span>
            <motion.span
              key={score.away}
              initial={{ scale: 1.8, color: '#ef4444' }}
              animate={{ scale: 1, color: '#ffffff' }}
              className="text-4xl font-black"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {score.away}
            </motion.span>
          </div>

          {/* Away (opponent) */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <p className="text-xs font-bold text-red-400 truncate max-w-[80px] text-center">{opponent?.pseudo}</p>
            <div className="text-xs text-gray-600">Cohésion {opponentCohesion}</div>
          </div>
        </div>

        {/* Timer */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">{String(minute).padStart(2, '0')}&apos;</span>
            <span className="text-xs text-gray-600 font-mono">
              {finished ? 'Coup de sifflet final' : `${Math.ceil(timeLeft / 1000)}s`}
            </span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-red-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Terrain animé */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Flash but */}
        <AnimatePresence>
          {goalFlash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none rounded-2xl"
              style={{ background: goalFlash.team === 'home' ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0.35)' }}
            >
              <motion.div
                initial={{ scale: 0.5, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-5xl mb-1">⚽</p>
                <p className="text-white font-black text-2xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>BUT !</p>
                <p className="text-white/80 text-sm">{goalFlash.player}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <svg
          viewBox="0 0 100 60"
          className="w-full h-auto"
          style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #14532d 100%)' }}
        >
          {/* Lignes du terrain */}
          <rect x="5" y="5" width="90" height="50" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="0.4" />
          {/* Milieu */}
          <line x1="50" y1="5" x2="50" y2="55" stroke="white" strokeOpacity="0.25" strokeWidth="0.4" />
          {/* Cercle central */}
          <circle cx="50" cy="30" r="8" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="0.4" />
          <circle cx="50" cy="30" r="0.8" fill="white" fillOpacity="0.3" />
          {/* Surface de réparation gauche */}
          <rect x="5" y="19" width="13" height="22" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.3" />
          <rect x="5" y="23" width="6" height="14" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="0.3" />
          {/* Surface de réparation droite */}
          <rect x="82" y="19" width="13" height="22" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.3" />
          <rect x="89" y="23" width="6" height="14" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="0.3" />
          {/* Buts */}
          <rect x="2" y="25" width="3.5" height="10" fill="#3b82f6" fillOpacity="0.4" stroke="#3b82f6" strokeOpacity="0.8" strokeWidth="0.4" rx="0.3" />
          <rect x="94.5" y="25" width="3.5" height="10" fill="#ef4444" fillOpacity="0.4" stroke="#ef4444" strokeOpacity="0.8" strokeWidth="0.4" rx="0.3" />

          {/* Joueurs HOME (bleus) */}
          {homePlayers.map((p, i) => {
            const base = HOME_POSITIONS[i] ?? { x: 25, y: 30 }
            const ox = Math.sin(elapsed * 0.0018 + i * 1.2) * 2.5
            const oy = Math.cos(elapsed * 0.0022 + i * 0.9) * 2
            return (
              <g key={p.id} transform={`translate(${base.x + ox}, ${base.y + oy})`}>
                <circle r="4" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="0.6" />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="2.5"
                  fill="white"
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                >
                  {initials(p.name)}
                </text>
              </g>
            )
          })}

          {/* Joueurs AWAY (rouges) */}
          {awayPlayers.map((p, i) => {
            const base = AWAY_POSITIONS[i] ?? { x: 75, y: 30 }
            const ox = Math.sin(elapsed * 0.0018 + i * 1.2 + 3) * 2.5
            const oy = Math.cos(elapsed * 0.0022 + i * 0.9 + 3) * 2
            return (
              <g key={p.id} transform={`translate(${base.x + ox}, ${base.y + oy})`}>
                <circle r="4" fill="#b91c1c" stroke="#fca5a5" strokeWidth="0.6" />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="2.5"
                  fill="white"
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                >
                  {initials(p.name)}
                </text>
              </g>
            )
          })}

          {/* Ballon */}
          <g transform={`translate(${ballPos.bx}, ${ballPos.by})`}>
            <circle r="2.2" fill="white" stroke="#e5e7eb" strokeWidth="0.4" />
            {/* Pentagones pour look ballon */}
            <circle r="0.8" fill="#374151" fillOpacity="0.6" />
          </g>
        </svg>
      </div>

      {/* Événements / historique */}
      <div className="glass rounded-xl p-3 space-y-1.5 max-h-[120px] overflow-y-auto">
        {events
          .filter((e) => elapsed >= e.timeMs)
          .reverse()
          .map((e, i) => (
            <motion.div
              key={`${e.minute}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-xs"
            >
              <span className="text-gray-500 w-6 shrink-0 font-mono">{e.minute}&apos;</span>
              <span>⚽</span>
              <span className="text-white font-semibold truncate">{e.playerName}</span>
              <span className={`ml-auto font-bold ${e.team === 'home' ? 'text-blue-400' : 'text-red-400'}`}>
                {e.team === 'home' ? challenger?.pseudo : opponent?.pseudo}
              </span>
            </motion.div>
          ))}
        {events.filter((e) => elapsed >= e.timeMs).length === 0 && (
          <p className="text-gray-600 text-xs text-center py-1">Match en cours…</p>
        )}
      </div>

      {/* Résultat final */}
      <AnimatePresence>
        {finished && finalScore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 text-center"
          >
            <div className="text-5xl mb-3">{isDraw ? '🤝' : iWon ? '🏆' : '💔'}</div>
            <h2
              className={`text-4xl font-black mb-2 ${isDraw ? 'text-gray-300' : iWon ? 'text-[#F5C518]' : 'text-red-400'}`}
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {isDraw ? 'MATCH NUL' : iWon ? 'VICTOIRE !' : 'DÉFAITE'}
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Score final : <span className="text-white font-bold">{finalScore.home} — {finalScore.away}</span>
            </p>

            <div className="flex gap-3 max-w-xs mx-auto">
              <a
                href="/battles/matchmaking"
                className="flex-1 bg-[#F5C518] text-black font-black py-3 rounded-xl text-sm flex items-center justify-center gap-1"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                <Swords size={14} /> REJOUER
              </a>
              <a
                href="/battles"
                className="flex-1 border border-white/10 text-gray-400 py-3 rounded-xl text-sm font-semibold text-center hover:text-white transition-colors"
              >
                Mes battles
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coaches (sidebar info) */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Coach ' + challenger?.pseudo, coach: challengerTeam?.coach, color: 'text-blue-400' },
          { label: 'Coach ' + opponent?.pseudo, coach: opponentTeam?.coach, color: 'text-red-400' },
        ].map(({ label, coach, color }) => coach && (
          <div key={label} className="glass rounded-xl p-3 flex items-center gap-2">
            <Trophy className={`w-4 h-4 ${color} shrink-0`} />
            <div className="min-w-0">
              <p className={`text-[10px] ${color} font-semibold truncate`}>{label}</p>
              <p className="text-white text-xs font-bold truncate">{coach.name}</p>
              <p className="text-gray-600 text-[10px]">{coach.nation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
