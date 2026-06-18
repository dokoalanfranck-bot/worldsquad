'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Swords, ChevronLeft, Zap, Users, Clock, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { DuelEvent } from '@/lib/duel-engine'

interface MatchResult {
  scoreA: number; scoreB: number
  events: DuelEvent[]
  winner: number
}

interface TournamentData {
  id: string
  status: 'waiting' | 'semi_active' | 'final_active' | 'finished' | 'cancelled'
  join_deadline: string | null
  p0_id: string;  p0_pseudo: string; p0_nation: string
  p1_id: string | null; p1_pseudo: string; p1_nation: string
  p2_id: string | null; p2_pseudo: string; p2_nation: string
  p3_id: string | null; p3_pseudo: string; p3_nation: string
  semi1: MatchResult | null
  semi2: MatchResult | null
  final: MatchResult | null
  semi1_duel_id:    string | null
  semi2_duel_id:    string | null
  final_duel_id:    string | null
  semi1_winner_id:  string | null
  semi1_winner_slot: number | null
  semi2_winner_id:  string | null
  semi2_winner_slot: number | null
  winner_slot: number | null
  winner_id:   string | null
  coins_won:   number
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

// ── Player slot widget ────────────────────────────────────────────────────────
function PlayerSlot({
  id, pseudo, nation, currentUserId, align = 'left',
}: {
  id: string | null; pseudo: string; nation: string
  currentUserId: string; align?: 'left' | 'right'
}) {
  const isUser = id === currentUserId
  return (
    <div className={`flex flex-col gap-0.5 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="font-black text-white truncate max-w-[80px]"
          style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem' }}>{pseudo}</span>
        {isUser && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold uppercase flex-shrink-0">Toi</span>
        )}
      </div>
      <span className="text-white/35 text-xs">{flag(nation)} {nation}</span>
    </div>
  )
}

// ── Waiting Room ──────────────────────────────────────────────────────────────
function WaitingRoom({
  t, currentUserId,
}: {
  t: TournamentData
  currentUserId: string
}) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [starting, setStarting] = useState(false)
  const isCreator = t.p0_id === currentUserId

  useEffect(() => {
    const deadline = t.join_deadline ? new Date(t.join_deadline).getTime() : 0
    const update = () => setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    update()
    const iv = setInterval(update, 500)
    return () => clearInterval(iv)
  }, [t.join_deadline])

  async function startWithBots() {
    if (starting) return
    setStarting(true)
    try {
      const res = await fetch(`/api/tournament/${t.id}/start`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        if (d.error !== 'Tournoi déjà démarré') {
          toast.error(d.error ?? 'Erreur')
          setStarting(false)
        }
      }
    } catch {
      toast.error('Erreur réseau')
      setStarting(false)
    }
  }

  const slots = [
    { id: t.p0_id, pseudo: t.p0_pseudo, nation: t.p0_nation },
    { id: t.p1_id, pseudo: t.p1_pseudo, nation: t.p1_nation },
    { id: t.p2_id, pseudo: t.p2_pseudo, nation: t.p2_nation },
    { id: t.p3_id, pseudo: t.p3_pseudo, nation: t.p3_nation },
  ]
  const filledCount = slots.filter((s) => s.id).length
  const isFull      = filledCount === 4

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">
            {isFull ? 'Lancement des demi-finales…' : 'Salle d\'attente'}
          </span>
        </div>
        <h2 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {filledCount}/4 JOUEURS
        </h2>
        <p className="text-white/30 text-sm">
          {isFull ? 'Tous les joueurs sont là — lancement imminent !' : 'En attente d\'autres joueurs…'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`rounded-2xl border p-4 flex flex-col items-center gap-2 min-h-[96px] justify-center transition-all ${
              slot.id
                ? slot.id === currentUserId
                  ? 'border-yellow-500/40 bg-yellow-500/8'
                  : 'border-white/15 bg-white/5'
                : 'border-white/5 bg-white/2'
            }`}
          >
            {slot.id ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg font-black text-white">
                  {slot.pseudo[0]?.toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-sm truncate max-w-[90px]"
                    style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    {slot.pseudo}
                  </p>
                  <p className="text-white/35 text-xs">{flag(slot.nation)} {slot.nation}</p>
                  {slot.id === currentUserId && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold uppercase">
                      Toi
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 opacity-30">
                <div className="w-10 h-10 rounded-xl border border-dashed border-white/20 flex items-center justify-center">
                  <Users size={16} className="text-white/40" />
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map((j) => (
                    <motion.div key={j} className="w-1 h-1 rounded-full bg-white/30"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, delay: j * 0.2, repeat: Infinity }} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {!isFull && !starting && (
        <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Clock size={14} />
              <span>Temps restant</span>
            </div>
            <span className={`font-black tabular-nums text-2xl ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {timeLeft}s
            </span>
          </div>
          {isCreator && timeLeft <= 45 && (
            <motion.button
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={startWithBots}
              className="w-full py-3.5 rounded-xl font-black text-black transition-all"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #F5C518 100%)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem' }}
            >
              LANCER AVEC DES BOTS
            </motion.button>
          )}
          {!isCreator && (
            <p className="text-white/20 text-xs text-center">
              Le créateur peut lancer avec des bots si le lobby n'est pas complet
            </p>
          )}
        </div>
      )}

      {(starting || isFull) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-4">
          <div className="w-8 h-8 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Création des demi-finales…</p>
        </motion.div>
      )}
    </div>
  )
}

// ── Semi match card ───────────────────────────────────────────────────────────
function SemiMatchCard({
  label, playerA, playerB, currentUserId, duelId, result, color, onPlay,
}: {
  label: string
  playerA: { id: string | null; pseudo: string; nation: string }
  playerB: { id: string | null; pseudo: string; nation: string }
  currentUserId: string
  duelId: string | null
  result: MatchResult | null
  color: string
  onPlay: () => void
}) {
  const isUserInMatch = playerA.id === currentUserId || playerB.id === currentUserId
  const isDone       = !!result
  const canPlay      = isUserInMatch && !!duelId && !isDone
  const isBotMatch   = !duelId && !isDone

  const winnerPseudo = isDone
    ? result.scoreA >= result.scoreB ? playerA.pseudo : playerB.pseudo
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-4 space-y-3"
      style={{ borderColor: `${color}30`, background: 'rgba(255,255,255,0.03)' }}
    >
      <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{label}</p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <PlayerSlot id={playerA.id} pseudo={playerA.pseudo} nation={playerA.nation}
          currentUserId={currentUserId} align="left" />

        <div className="flex flex-col items-center gap-0.5">
          {isDone ? (
            <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }}
              className="text-2xl font-black tabular-nums"
              style={{ fontFamily: 'Bebas Neue, sans-serif', color }}>
              {result.scoreA}–{result.scoreB}
            </motion.span>
          ) : (
            <span className="text-white/20 font-black text-xl"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}>VS</span>
          )}
        </div>

        <PlayerSlot id={playerB.id} pseudo={playerB.pseudo} nation={playerB.nation}
          currentUserId={currentUserId} align="right" />
      </div>

      {canPlay && (
        <motion.button
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }} onClick={onPlay}
          className="w-full py-3 rounded-xl font-black text-black flex items-center justify-center gap-2"
          style={{ background: color, fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.95rem' }}
        >
          <Play size={13} className="fill-black" />
          JOUER TA DEMI-FINALE
        </motion.button>
      )}
      {isDone && (
        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <p className="text-green-400 text-xs font-bold">Terminé</p>
          {winnerPseudo && <p className="text-white/30 text-xs">→ {winnerPseudo}</p>}
        </div>
      )}
      {!isDone && !canPlay && isUserInMatch && (
        <div className="flex items-center justify-center gap-2 py-0.5">
          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
          <p className="text-white/30 text-xs">En attente de ton adversaire…</p>
        </div>
      )}
      {isBotMatch && (
        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <p className="text-purple-400/60 text-xs">Calculé automatiquement</p>
        </div>
      )}
    </motion.div>
  )
}

// ── Semis View ────────────────────────────────────────────────────────────────
function SemisView({ t, currentUserId }: { t: TournamentData; currentUserId: string }) {
  const router = useRouter()

  const players = [
    { id: t.p0_id,  pseudo: t.p0_pseudo, nation: t.p0_nation },
    { id: t.p1_id,  pseudo: t.p1_pseudo, nation: t.p1_nation },
    { id: t.p2_id,  pseudo: t.p2_pseudo, nation: t.p2_nation },
    { id: t.p3_id,  pseudo: t.p3_pseudo, nation: t.p3_nation },
  ]

  const bothDone = !!t.semi1 && !!t.semi2

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
          <Swords size={11} className="text-blue-400" />
          <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Demi-finales</span>
        </div>
      </div>

      <SemiMatchCard label="DEMI-FINALE 1"
        playerA={players[0]} playerB={players[1]}
        currentUserId={currentUserId}
        duelId={t.semi1_duel_id} result={t.semi1}
        color="#F5C518"
        onPlay={() => t.semi1_duel_id && router.push(`/battles/duel/${t.semi1_duel_id}`)}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/5" />
        <p className="text-white/15 text-[10px] uppercase tracking-widest font-bold">Bracket</p>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      <SemiMatchCard label="DEMI-FINALE 2"
        playerA={players[2]} playerB={players[3]}
        currentUserId={currentUserId}
        duelId={t.semi2_duel_id} result={t.semi2}
        color="#a855f7"
        onPlay={() => t.semi2_duel_id && router.push(`/battles/duel/${t.semi2_duel_id}`)}
      />

      {bothDone && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-2 py-3">
          <div className="w-6 h-6 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
          <p className="text-white/30 text-sm">Préparation de la finale…</p>
        </motion.div>
      )}
    </div>
  )
}

// ── Final View ────────────────────────────────────────────────────────────────
function FinalView({ t, currentUserId }: { t: TournamentData; currentUserId: string }) {
  const router = useRouter()

  const players = [
    { id: t.p0_id,  pseudo: t.p0_pseudo, nation: t.p0_nation },
    { id: t.p1_id,  pseudo: t.p1_pseudo, nation: t.p1_nation },
    { id: t.p2_id,  pseudo: t.p2_pseudo, nation: t.p2_nation },
    { id: t.p3_id,  pseudo: t.p3_pseudo, nation: t.p3_nation },
  ]

  const s1slot    = t.semi1_winner_slot ?? (t.semi1?.winner ?? null)
  const s2slot    = t.semi2_winner_slot ?? (t.semi2?.winner ?? null)
  const finalist1 = s1slot !== null ? players[s1slot] : null
  const finalist2 = s2slot !== null ? players[s2slot] : null
  const isFinalist = currentUserId === t.semi1_winner_id || currentUserId === t.semi2_winner_id
  const canPlay    = isFinalist && !!t.final_duel_id && !t.final

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
          <Trophy size={11} className="text-orange-400" />
          <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Finale</span>
        </div>
      </div>

      {/* Semi results summary */}
      <div className="grid grid-cols-2 gap-3">
        {t.semi1 && finalist1 && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
            <p className="text-[9px] text-yellow-400 uppercase font-bold mb-1 tracking-widest">DF 1</p>
            <p className="text-yellow-400 text-xl font-black" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {t.semi1.scoreA}–{t.semi1.scoreB}
            </p>
            <p className="text-white font-black text-sm truncate" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {flag(finalist1.nation)} {finalist1.pseudo}
            </p>
          </div>
        )}
        {t.semi2 && finalist2 && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-center">
            <p className="text-[9px] text-purple-400 uppercase font-bold mb-1 tracking-widest">DF 2</p>
            <p className="text-purple-400 text-xl font-black" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {t.semi2.scoreA}–{t.semi2.scoreB}
            </p>
            <p className="text-white font-black text-sm truncate" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {flag(finalist2.nation)} {finalist2.pseudo}
            </p>
          </div>
        )}
      </div>

      {/* Final matchup */}
      {finalist1 && finalist2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-orange-500/30 p-5 space-y-4"
          style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.06) 0%,rgba(245,197,24,0.06) 100%)' }}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <PlayerSlot id={finalist1.id} pseudo={finalist1.pseudo} nation={finalist1.nation}
              currentUserId={currentUserId} align="left" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-orange-400 text-2xl font-black"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}>VS</span>
              <span className="text-[9px] text-orange-400/50 uppercase tracking-widest font-bold">Finale</span>
            </div>
            <PlayerSlot id={finalist2.id} pseudo={finalist2.pseudo} nation={finalist2.nation}
              currentUserId={currentUserId} align="right" />
          </div>

          {canPlay && (
            <motion.button
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`/battles/duel/${t.final_duel_id}`)}
              className="w-full py-4 rounded-xl font-black text-black flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg,#f97316 0%,#F5C518 100%)',
                fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem',
                boxShadow: '0 0 30px rgba(249,115,22,0.4)',
              }}
            >
              <Trophy size={15} className="fill-black" />
              JOUER LA FINALE
            </motion.button>
          )}

          {isFinalist && !t.final_duel_id && (
            <div className="flex items-center justify-center gap-2 py-1">
              <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
              <p className="text-white/30 text-xs">Préparation de la finale…</p>
            </div>
          )}

          {t.final && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <p className="text-green-400 text-xs font-bold">Finale terminée</p>
            </div>
          )}

          {!isFinalist && (
            <p className="text-white/25 text-xs text-center">
              Tu as été éliminé en demi-finale — suis la finale
            </p>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ── Match Card (bracket finished view) ───────────────────────────────────────
function MatchCard({
  label, playerA, nationA, isUserA, playerB, nationB, isUserB,
  result, revealed, color,
}: {
  label: string
  playerA: string; nationA: string; isUserA: boolean
  playerB: string; nationB: string; isUserB: boolean
  result: MatchResult
  revealed: boolean
  color: string
}) {
  const isAWinner = revealed && result.scoreA > result.scoreB
  const isBWinner = revealed && result.scoreB > result.scoreA

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${color}30`, background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{label}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-3">
        <div className={`flex flex-col gap-0.5 transition-opacity ${revealed && isBWinner ? 'opacity-35' : ''}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-white truncate max-w-[80px]"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem' }}>{playerA}</span>
            {isUserA && <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold uppercase flex-shrink-0">Toi</span>}
          </div>
          <span className="text-white/35 text-xs">{flag(nationA)} {nationA}</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div key="s" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="text-2xl font-black tabular-nums" style={{ fontFamily: 'Bebas Neue, sans-serif', color }}>
                {result.scoreA}–{result.scoreB}
              </motion.div>
            ) : (
              <motion.div key="h" className="text-2xl font-black tabular-nums text-white/20"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}>?–?</motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`flex flex-col items-end gap-0.5 transition-opacity ${revealed && isAWinner ? 'opacity-35' : ''}`}>
          <div className="flex items-center gap-1.5 justify-end flex-wrap">
            {isUserB && <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold uppercase flex-shrink-0">Toi</span>}
            <span className="font-black text-white truncate max-w-[80px]"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem' }}>{playerB}</span>
          </div>
          <span className="text-white/35 text-xs">{nationB} {flag(nationB)}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Bracket View (finished) ───────────────────────────────────────────────────
function BracketView({ t, currentUserId }: { t: TournamentData; currentUserId: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current || skipped) return
    started.current = true
    const delays = [1200, 2800, 4400, 6000, 7600]
    const timers = delays.map((d, i) => setTimeout(() => setPhase(i + 1), d))
    return () => timers.forEach(clearTimeout)
  }, [skipped])

  if (!t.semi1 || !t.semi2 || !t.final || t.winner_slot === null) return null

  const players = [
    { pseudo: t.p0_pseudo, nation: t.p0_nation, isUser: t.p0_id === currentUserId },
    { pseudo: t.p1_pseudo, nation: t.p1_nation, isUser: t.p1_id === currentUserId },
    { pseudo: t.p2_pseudo, nation: t.p2_nation, isUser: t.p2_id === currentUserId },
    { pseudo: t.p3_pseudo, nation: t.p3_nation, isUser: t.p3_id === currentUserId },
  ]

  const s1w       = t.semi1.winner   // 0 or 1
  const s2w       = t.semi2.winner   // 2 or 3
  const fw        = t.final.winner   // 0–3
  const finalist1 = players[s1w]
  const finalist2 = players[s2w]
  const champion  = players[fw]
  const isUserChamp = champion.isUser
  const loserSlot   = s1w === fw ? s2w : s1w
  const coinsWon    = isUserChamp ? 300 : players[loserSlot].isUser ? 100 : 0

  return (
    <div className="space-y-4">
      {phase < 5 && (
        <div className="flex justify-end">
          <button onClick={() => { setSkipped(true); setPhase(5) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-white/30 text-xs font-bold hover:bg-white/10 transition-colors">
            <Zap size={11} /> Skip
          </button>
        </div>
      )}

      <div>
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
          <Swords size={11} /> Demi-finales
        </p>
        <div className="space-y-3">
          <MatchCard label="Demi-finale 1"
            playerA={players[0].pseudo} nationA={players[0].nation} isUserA={players[0].isUser}
            playerB={players[1].pseudo} nationB={players[1].nation} isUserB={players[1].isUser}
            result={t.semi1} revealed={phase >= 1} color="#F5C518" />
          <MatchCard label="Demi-finale 2"
            playerA={players[2].pseudo} nationA={players[2].nation} isUserA={players[2].isUser}
            playerB={players[3].pseudo} nationB={players[3].nation} isUserB={players[3].isUser}
            result={t.semi2} revealed={phase >= 2} color="#a855f7" />
        </div>
      </div>

      <motion.div animate={{ opacity: phase >= 2 ? 1 : 0 }} transition={{ duration: 0.5 }}
        className="flex items-center justify-center gap-4 py-1">
        {[finalist1, finalist2].map((f, i) => (
          <div key={i} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all ${
            phase >= (i === 0 ? 1 : 2)
              ? (f.isUser ? 'border-yellow-500/40 bg-yellow-500/8' : 'border-white/15 bg-white/5')
              : 'border-white/5 opacity-20'
          }`}>
            {phase >= (i === 0 ? 1 : 2) ? (
              <>
                <p className="text-white font-black text-sm truncate max-w-[90px]"
                  style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  {flag(f.nation)} {f.pseudo}
                </p>
                {f.isUser && <span className="text-[9px] px-1 rounded bg-yellow-500/20 text-yellow-400 font-bold uppercase">Toi</span>}
              </>
            ) : (
              <p className="text-white/20 text-xs font-bold">À déterminer…</p>
            )}
          </div>
        ))}
      </motion.div>

      <AnimatePresence>
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={12} className="text-orange-400" />
              <p className="text-orange-400 text-[10px] uppercase tracking-widest font-bold">Finale</p>
            </div>
            <MatchCard label="FINALE 🏆"
              playerA={finalist1.pseudo} nationA={finalist1.nation} isUserA={finalist1.isUser}
              playerB={finalist2.pseudo} nationB={finalist2.nation} isUserB={finalist2.isUser}
              result={t.final} revealed={phase >= 4} color="#f97316" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase >= 5 && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="mt-4 rounded-2xl border overflow-hidden relative"
            style={{
              borderColor: isUserChamp ? 'rgba(245,197,24,0.5)' : 'rgba(255,255,255,0.15)',
              background: isUserChamp
                ? 'linear-gradient(135deg,rgba(245,197,24,0.12) 0%,rgba(245,197,24,0.04) 100%)'
                : 'rgba(255,255,255,0.04)',
              boxShadow: isUserChamp ? '0 0 60px rgba(245,197,24,0.25)' : undefined,
            }}>
            {isUserChamp && (
              <motion.div className="absolute inset-0 rounded-2xl pointer-events-none"
                animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }}
                style={{ background: 'radial-gradient(ellipse at center,rgba(245,197,24,0.15) 0%,transparent 70%)' }} />
            )}
            <div className="relative p-6 text-center">
              <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 18, delay: 0.15 }}
                className="text-5xl mb-3">🏆</motion.div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Champion</p>
              <h2 className="text-4xl font-black text-white mb-1"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                {flag(champion.nation)} {champion.pseudo}
              </h2>
              {isUserChamp && (
                <p className="text-white/50 text-sm">Félicitations ! Tu as remporté le tournoi 🎉</p>
              )}
            </div>
            {coinsWon > 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="relative px-6 pb-5 text-center">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                  <span className="text-yellow-400 font-black text-lg"
                    style={{ fontFamily: 'Bebas Neue, sans-serif' }}>+{coinsWon} COINS</span>
                  <span className="text-xl">🪙</span>
                </div>
                <p className="text-white/30 text-xs mt-2">
                  {isUserChamp ? '🏆 1ère place' : '🥈 2ème place — finaliste'}
                </p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="relative px-6 pb-4 text-center">
                <p className="text-white/25 text-xs">Éliminé en demi-finale — rejoue pour gagner des coins !</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase >= 5 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="mt-6 space-y-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/battles')}
              className="w-full py-4 rounded-2xl font-black text-black transition-all"
              style={{ background: '#F5C518', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', boxShadow: '0 0 30px rgba(245,197,24,0.3)' }}>
              🏆 REJOUER UN TOURNOI
            </motion.button>
            <button onClick={() => router.push('/battles')}
              className="w-full py-3 rounded-2xl text-white/40 text-sm font-bold hover:text-white/60 transition-colors">
              Retour aux Battles
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function TournamentClient({ tournament: initial, currentUserId }: {
  tournament: TournamentData
  currentUserId: string
}) {
  const router  = useRouter()
  const supabase = createClient()
  const [t, setT] = useState(initial)

  // Central Realtime subscription on the tournament row
  useEffect(() => {
    const ch = supabase
      .channel(`tournament-${t.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${t.id}` },
        ({ new: row }) => setT(row as TournamentData),
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [t.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Duel changes → trigger advance API when a tournament duel finishes
  useEffect(() => {
    const hasDuels = t.semi1_duel_id || t.semi2_duel_id || t.final_duel_id
    if (!hasDuels) return

    const ch = supabase
      .channel(`duels-${t.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'duels', filter: `tournament_id=eq.${t.id}` },
        async ({ new: row }) => {
          if ((row as { winner_id?: string | null }).winner_id) {
            await fetch(`/api/tournament/${t.id}/advance`, { method: 'POST' }).catch(() => {})
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [t.id, t.semi1_duel_id, t.semi2_duel_id, t.final_duel_id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen pb-28 px-4 max-w-lg mx-auto py-6">
      <button onClick={() => router.push('/battles')}
        className="flex items-center gap-2 text-white/40 text-sm mb-6 hover:text-white/70 transition-colors">
        <ChevronLeft size={16} /> Battles
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-yellow-500/15 flex items-center justify-center">
          <Trophy size={22} className="text-yellow-400" />
        </div>
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest">WorldSquad</p>
          <h1 className="text-4xl font-black text-white leading-none"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}>TOURNOI</h1>
        </div>
      </div>

      {t.status === 'waiting'      && <WaitingRoom t={t} currentUserId={currentUserId} />}
      {t.status === 'semi_active'  && <SemisView   t={t} currentUserId={currentUserId} />}
      {t.status === 'final_active' && <FinalView   t={t} currentUserId={currentUserId} />}
      {t.status === 'finished'     && <BracketView t={t} currentUserId={currentUserId} />}
    </div>
  )
}
