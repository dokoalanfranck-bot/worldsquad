'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Swords, ChevronRight, Gift,
  TrendingUp, TrendingDown, Minus, Check, X,
  Users, Trophy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Profile { id: string | null; pseudo: string; nation: string; photo_url: string | null }

interface PenaltyBattle {
  id: string; status: string; current_round: number
  challenger_score: number; opponent_score: number
  winner_id: string | null; challenger_id: string; opponent_id: string | null
  challenger: Profile; opponent: Profile | null; created_at: string
}

interface Duel {
  id: string; status: string; is_bot: boolean; is_friend_battle: boolean; bot_name: string | null
  challenger_score: number | null; opponent_score: number | null
  winner_id: string | null; coins_stake: number; stake_count: number
  stolen_card_ids: string[] | null; created_at: string
  challenger_id: string; opponent_id: string | null
  challenger: Profile; opponent: Profile
}

interface LobbyPlayer {
  userId: string | null
  pseudo: string
  nation: string
  photo_url: string | null
  isBot: boolean
  botName?: string
  entered_at: string
  isSelf: boolean
}

type Mode = 'duel' | 'penalty' | 'tournament'

const NATION_FLAGS: Record<string, string> = {
  France:'🇫🇷', Brazil:'🇧🇷', Argentina:'🇦🇷', England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain:'🇪🇸', Germany:'🇩🇪', Portugal:'🇵🇹', Netherlands:'🇳🇱',
  Morocco:'🇲🇦', USA:'🇺🇸', Mexico:'🇲🇽', Belgium:'🇧🇪',
  Norway:'🇳🇴', Croatia:'🇭🇷',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

// ── Bot pool (mirrors server) ──────────────────────────────────────────────────
const BOT_POOL = [
  { pseudo: 'Shadow_X42', nation: 'France' }, { pseudo: 'NightWolf7', nation: 'Brazil' },
  { pseudo: 'CobraZone', nation: 'Argentina' }, { pseudo: 'GhostV10', nation: 'Portugal' },
  { pseudo: 'BlueStar22', nation: 'Morocco' }, { pseudo: 'TigerBoy33', nation: 'Senegal' },
  { pseudo: 'FlashZero', nation: 'England' }, { pseudo: 'DarkFox21', nation: 'Spain' },
  { pseudo: 'CometXI', nation: 'Germany' }, { pseudo: 'AceFire99', nation: 'Netherlands' },
  { pseudo: 'KingSolo88', nation: 'Ivory Coast' }, { pseudo: 'ProZone_55', nation: 'Japan' },
  { pseudo: 'NovaStar3', nation: 'USA' }, { pseudo: 'CrownKing77', nation: 'Belgium' },
  { pseudo: 'SpeedForce', nation: 'Colombia' }, { pseudo: 'IronWave_9', nation: 'Croatia' },
  { pseudo: 'StormBolt', nation: 'Mexico' }, { pseudo: 'RedPhoenix', nation: 'Poland' },
  { pseudo: 'ZeroGravX', nation: 'South Korea' }, { pseudo: 'LegendOf7', nation: 'Cameroon' },
]
function getBotsForMode(m: Mode): LobbyPlayer[] {
  const seed = Math.floor(Date.now() / 120000)
  const start = seed % BOT_POOL.length
  const count = m === 'penalty' ? 2 : 3
  const bots: LobbyPlayer[] = []
  for (let i = 0; i < count; i++) {
    const b = BOT_POOL[(start + i) % BOT_POOL.length]
    bots.push({ userId: null, pseudo: b.pseudo, nation: b.nation, photo_url: null, isBot: true, botName: b.pseudo, entered_at: new Date(0).toISOString(), isSelf: false })
  }
  return bots
}

// ── Challenge Modal ────────────────────────────────────────────────────────────
function ChallengeModal({
  target, mode, onClose, onConfirm,
}: {
  target: LobbyPlayer
  mode: Mode
  onClose: () => void
  onConfirm: (stakeCount: number) => void
}) {
  const [stakeCount, setStakeCount] = useState(1)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm(stakeCount)
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm glass rounded-3xl border border-white/10 p-6 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#F5C518]/15 border border-[#F5C518]/30">
            <span className="text-2xl font-black text-[#F5C518]">{target.pseudo[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="text-white font-black text-xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {target.pseudo}
            </p>
            <p className="text-white/40 text-sm">{flag(target.nation)} {target.nation}</p>
          </div>
        </div>

        {/* Mode indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${mode === 'duel' ? 'bg-[#F5C518]/8 border border-[#F5C518]/20' : 'bg-green-500/8 border border-green-500/20'}`}>
          {mode === 'duel'
            ? <Swords size={14} className="text-[#F5C518]" />
            : <span className="text-sm">⚽</span>
          }
          <p className="text-white/60 text-sm">
            {mode === 'duel' ? 'Battle Classique' : 'Tirs au but'}
          </p>
        </div>

        {/* Stake selector */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Mise — cartes en jeu</p>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setStakeCount(n)}
                className={`flex-1 py-3 rounded-xl font-black text-lg transition-all ${
                  stakeCount === n
                    ? 'bg-[#F5C518] text-black shadow-lg shadow-yellow-500/25'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-white/25 text-xs mt-2 text-center">
            {stakeCount} carte{stakeCount > 1 ? 's' : ''} mise{stakeCount > 1 ? 's' : ''} par joueur
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-white/5 text-white/40 font-bold hover:bg-white/10 transition-colors">
            Annuler
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-black disabled:opacity-50 transition-all"
            style={{
              fontFamily: 'Bebas Neue, sans-serif',
              background: mode === 'duel' ? '#F5C518' : '#22c55e',
              boxShadow: mode === 'duel' ? '0 0 20px rgba(245,197,24,0.3)' : '0 0 20px rgba(34,197,94,0.3)',
            }}
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : <><Swords size={16} /> DÉFIER</>
            }
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Lobby Player Card ──────────────────────────────────────────────────────────
function LobbyCard({ player, mode, onChallenge }: {
  player: LobbyPlayer
  mode: Mode
  onChallenge: (p: LobbyPlayer) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
        player.isSelf
          ? 'border-[#F5C518]/30 bg-[#F5C518]/8'
          : 'border-white/8 bg-white/3 hover:bg-white/6'
      }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10">
        <span className="text-white font-black text-sm">{player.pseudo[0]?.toUpperCase()}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white font-bold text-sm truncate">{player.pseudo}</p>
          {player.isSelf && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#F5C518]/20 text-[#F5C518] font-bold uppercase flex-shrink-0">TOI</span>}
        </div>
        <p className="text-white/30 text-xs">{flag(player.nation)} {player.nation}</p>
      </div>

      {/* Status dot + challenge button */}
      {!player.isSelf && (
        <button
          onClick={() => onChallenge(player)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-[#F5C518]/15 text-[#F5C518] hover:bg-[#F5C518]/25"
        >
          <><Swords size={11} /> Défier</>
        </button>
      )}
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface TournamentRecord {
  id: string
  winner_slot: number | null
  coins_won: number
  p0_pseudo: string; p0_nation: string
  p1_pseudo: string; p1_nation: string
  p2_pseudo: string; p2_nation: string
  p3_pseudo: string; p3_nation: string
  semi1: { scoreA: number; scoreB: number; winner: number } | null
  semi2: { scoreA: number; scoreB: number; winner: number } | null
  final: { scoreA: number; scoreB: number; winner: number } | null
  created_at: string
}

export function BattlesHub({ duels, currentUserId, penaltyBattles = [], tournaments = [], currentUser }: {
  duels: Duel[]
  currentUserId: string
  penaltyBattles?: PenaltyBattle[]
  tournaments?: TournamentRecord[]
  currentUser: { id: string; pseudo: string; nation: string; photo_url: string | null }
}) {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('duel')
  const [launchingTournament, setLaunchingTournament] = useState(false)
  const [onlinePlayers, setOnlinePlayers] = useState<LobbyPlayer[]>([])
  const [challengeTarget, setChallengeTarget] = useState<LobbyPlayer | null>(null)
  const [challenging, setChallenging] = useState(false)

  const [accepting, setAccepting] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [cancellingPenalty, setCancellingPenalty] = useState<string | null>(null)

  // ── Supabase Presence — auto-join quand la page est ouverte ───────────────
  useEffect(() => {
    const channel = supabase.channel('battles-presence', {
      config: { presence: { key: currentUserId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{
          userId: string; pseudo: string; nation: string; photo_url: string | null; joinedAt: string
        }>()
        const players: LobbyPlayer[] = []
        for (const presences of Object.values(state)) {
          const p = presences[0]
          if (p && p.userId !== currentUserId) {
            players.push({ userId: p.userId, pseudo: p.pseudo, nation: p.nation, photo_url: p.photo_url, isBot: false, entered_at: p.joinedAt, isSelf: false })
          }
        }
        setOnlinePlayers(players)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUserId,
            pseudo: currentUser.pseudo,
            nation: currentUser.nation,
            photo_url: currentUser.photo_url,
            joinedAt: new Date().toISOString(),
          })
        }
      })

    return () => {
      void channel.untrack()
      supabase.removeChannel(channel)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime incoming invites ─────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('my-invites-watch')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'duels',
        filter: `opponent_id=eq.${currentUserId}`,
      }, (p) => {
        if ((p.new as { status: string }).status === 'invited') router.refresh()
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'penalty_battles',
        filter: `opponent_id=eq.${currentUserId}`,
      }, (p) => {
        if ((p.new as { status: string }).status === 'invited') router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Challenge ─────────────────────────────────────────────────────────────
  async function sendChallenge(stakeCount: number) {
    if (!challengeTarget) return
    setChallenging(true)
    try {
      const body = challengeTarget.isBot
        ? { botName: challengeTarget.botName, mode, stakeCount }
        : { targetUserId: challengeTarget.userId, mode, stakeCount }

      const res = await fetch('/api/lobby/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { duelId?: string; battleId?: string; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }

      setChallengeTarget(null)

      if (data.duelId) router.push(`/battles/duel/${data.duelId}`)
      else if (data.battleId) router.push(`/battles/penalty/${data.battleId}`)
    } catch { toast.error('Erreur réseau') }
    finally { setChallenging(false) }
  }

  // ── Accept / Decline invites ──────────────────────────────────────────────
  async function acceptInvite(duelId: string) {
    setAccepting(duelId)
    try {
      const res = await fetch(`/api/duels/${duelId}/accept-invite`, { method: 'POST' })
      if (!res.ok) { toast.error('Erreur'); return }
      router.push(`/battles/duel/${duelId}`)
    } catch { toast.error('Erreur réseau') }
    finally { setAccepting(null) }
  }

  async function declineInvite(duelId: string) {
    await fetch(`/api/duels/${duelId}/decline-invite`, { method: 'POST' })
    router.refresh()
  }

  async function acceptPenaltyInvite(battleId: string) {
    setAccepting(battleId)
    try {
      const res = await fetch(`/api/penalty/${battleId}/accept-invite`, { method: 'POST' })
      if (!res.ok) { toast.error('Erreur'); return }
      router.push(`/battles/penalty/${battleId}`)
    } catch { toast.error('Erreur réseau') }
    finally { setAccepting(null) }
  }

  async function declinePenaltyInvite(battleId: string) {
    await fetch(`/api/penalty/${battleId}/decline-invite`, { method: 'POST' })
    router.refresh()
  }

  async function cancelDuel(duelId: string) {
    setCancelling(duelId)
    try {
      await fetch(`/api/duels/${duelId}/cancel`, { method: 'POST' })
      router.refresh()
    } catch { toast.error('Erreur réseau') }
    finally { setCancelling(null) }
  }

  async function cancelPenalty(battleId: string) {
    setCancellingPenalty(battleId)
    try {
      await fetch(`/api/penalty/${battleId}/cancel`, { method: 'POST' })
      router.refresh()
    } catch { toast.error('Erreur réseau') }
    finally { setCancellingPenalty(null) }
  }

  // ── Tournament ───────────────────────────────────────────────────────────
  async function launchTournament() {
    setLaunchingTournament(true)
    try {
      const res = await fetch('/api/tournament/find', { method: 'POST' })
      const data = await res.json() as { tournamentId?: string; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      if (data.tournamentId) router.push(`/battles/tournament/${data.tournamentId}`)
    } catch { toast.error('Erreur réseau') }
    finally { setLaunchingTournament(false) }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const invitedDuels    = duels.filter((d) => d.status === 'invited' && d.opponent_id === currentUserId)
  const invitedPenalties = penaltyBattles.filter((p) => p.status === 'invited' && p.opponent_id === currentUserId)
  const activeDuels     = duels.filter((d) => ['open', 'picking', 'stealing'].includes(d.status))
  const activePenalty   = penaltyBattles.filter((p) => ['waiting', 'picking', 'active', 'stealing'].includes(p.status))
  const finished        = duels.filter((d) => d.status === 'finished')
  const finishedPenalty = penaltyBattles.filter((p) => p.status === 'finished')

  const visibleLobby = [...onlinePlayers, ...getBotsForMode(mode)]

  return (
    <div className="min-h-screen px-4 lg:px-8 py-6 max-w-2xl lg:max-w-5xl mx-auto pb-28">

      {/* Header */}
      <div className="mb-6">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">WorldSquad</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center">
            <Swords size={22} className="text-orange-400" />
          </div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>BATTLES</h1>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          ['duel',       '⚔️', 'Classique',   'bg-[#F5C518] text-black'],
          ['penalty',    '⚽', 'Tirs au but',  'bg-green-500 text-black'],
          ['tournament', '🏆', 'Tournoi',      'bg-orange-500 text-black'],
        ] as const).map(([m, emoji, label, activeCls]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === m ? activeCls : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>{emoji}</span> {label}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

        {/* ── Left column ───────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Incoming invites */}
          {(invitedDuels.length > 0 || invitedPenalties.length > 0) && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Défis reçus</p>
              <div className="space-y-2">
                {invitedDuels.map((d) => (
                  <motion.div key={d.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-4 border border-[#F5C518]/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F5C518]/15 flex items-center justify-center">
                        <Swords size={16} className="text-[#F5C518]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm">{flag(d.challenger.nation)} {d.challenger.pseudo}</p>
                        <p className="text-white/30 text-xs">⚔️ Battle · mise {d.stake_count ?? 1} carte{(d.stake_count ?? 1) > 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-[#F5C518] text-xs font-black uppercase animate-pulse">Défi !</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptInvite(d.id)} disabled={accepting === d.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#F5C518]/15 text-[#F5C518] rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-[#F5C518]/25 transition-colors">
                        <Check size={13} /> Accepter
                      </button>
                      <button onClick={() => declineInvite(d.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors">
                        <X size={13} /> Refuser
                      </button>
                    </div>
                  </motion.div>
                ))}
                {invitedPenalties.map((pb) => (
                  <motion.div key={pb.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-4 border border-green-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center text-base">⚽</div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm">{flag(pb.challenger.nation)} {pb.challenger.pseudo}</p>
                        <p className="text-white/30 text-xs">Tirs au but</p>
                      </div>
                      <span className="text-green-400 text-xs font-black uppercase animate-pulse">Défi !</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptPenaltyInvite(pb.id)} disabled={accepting === pb.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500/15 text-green-400 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-green-500/25 transition-colors">
                        <Check size={13} /> Accepter
                      </button>
                      <button onClick={() => declinePenaltyInvite(pb.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors">
                        <X size={13} /> Refuser
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Active battles */}
          {(activeDuels.length > 0 || activePenalty.length > 0) && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">En cours</p>
              <div className="space-y-2">
                {activeDuels.map((d) => {
                  const isChallenger = d.challenger_id === currentUserId
                  const them = isChallenger ? d.opponent : d.challenger
                  const label = d.status === 'open' ? 'En attente…' : d.status === 'picking' ? 'Sélection' : 'Vol en cours'
                  return (
                    <div key={d.id} className="glass rounded-2xl p-3.5 border border-[#F5C518]/20 flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/battles/duel/${d.id}`)}>
                        <span className="w-2 h-2 rounded-full bg-[#F5C518] animate-pulse flex-shrink-0" />
                        <div>
                          <p className="text-[#F5C518] text-[10px] font-black uppercase">{label}</p>
                          <p className="text-white font-bold text-sm">⚔️ vs {them?.pseudo ?? '…'}</p>
                        </div>
                        <ChevronRight size={14} className="text-[#F5C518] ml-auto flex-shrink-0" />
                      </div>
                      {['open', 'picking'].includes(d.status) && (
                        <button onClick={() => cancelDuel(d.id)} disabled={cancelling === d.id}
                          className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 flex-shrink-0 disabled:opacity-40">
                          {cancelling === d.id ? <div className="w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin" /> : <X size={13} />}
                        </button>
                      )}
                    </div>
                  )
                })}
                {activePenalty.map((pb) => {
                  const isChallenger = pb.challenger_id === currentUserId
                  const them = isChallenger ? pb.opponent : pb.challenger
                  const label = pb.status === 'waiting' ? 'En attente…' : pb.status === 'picking' ? 'Sélection' : `Tour ${pb.current_round}`
                  return (
                    <div key={pb.id} className="glass rounded-2xl p-3.5 border border-green-500/20 flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/battles/penalty/${pb.id}`)}>
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                        <div>
                          <p className="text-green-400 text-[10px] font-black uppercase">{label}</p>
                          <p className="text-white font-bold text-sm">⚽ vs {them?.pseudo ?? '…'}</p>
                        </div>
                        <ChevronRight size={14} className="text-green-400 ml-auto flex-shrink-0" />
                      </div>
                      {['waiting', 'picking'].includes(pb.status) && (
                        <button onClick={() => cancelPenalty(pb.id)} disabled={cancellingPenalty === pb.id}
                          className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 flex-shrink-0 disabled:opacity-40">
                          {cancellingPenalty === pb.id ? <div className="w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin" /> : <X size={13} />}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Tournament mode UI ── */}
          {mode === 'tournament' && (
            <div className="space-y-4">
              {/* Info card */}
              <div className="glass rounded-2xl border border-orange-500/20 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                    <Trophy size={22} className="text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>MODE TOURNOI</h2>
                    <p className="text-white/40 text-xs">4 joueurs · Bracket éliminatoire</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: '⚔️', label: '2 Demi-finales', desc: 'Toi vs bot · bot vs bot' },
                    { icon: '🏆', label: 'Finale',         desc: "Les 2 vainqueurs s'affrontent" },
                    { icon: '🪙', label: 'Récompenses',    desc: '1ère place +300 coins · 2ème place +100 coins' },
                  ].map(({ icon, label, desc }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-lg flex-shrink-0">{icon}</span>
                      <div>
                        <p className="text-white font-bold text-sm">{label}</p>
                        <p className="text-white/35 text-xs">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Launch button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={launchTournament}
                disabled={launchingTournament}
                className="w-full py-5 rounded-2xl font-black text-black disabled:opacity-60 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #F5C518 100%)',
                  fontFamily: 'Bebas Neue, sans-serif',
                  fontSize: '1.15rem',
                  boxShadow: '0 0 30px rgba(249,115,22,0.35)',
                }}
              >
                {launchingTournament
                  ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
                  : '🏆 LANCER UN TOURNOI'
                }
              </motion.button>

              <p className="text-white/25 text-xs text-center">Résultat instantané · bracket animé</p>
            </div>
          )}

          {/* Lobby (hidden in tournament mode) */}
          {mode !== 'tournament' && <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            {/* Lobby header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Users size={14} className={mode === 'duel' ? 'text-[#F5C518]' : 'text-green-400'} />
                <p className="text-white font-bold text-sm">
                  {mode === 'duel' ? '⚔️ Joueurs disponibles' : '⚽ Joueurs disponibles'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-bold">{visibleLobby.length} disponible{visibleLobby.length > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Player list */}
            <div className="p-3 space-y-2">
              {visibleLobby.map((p) => (
                <LobbyCard
                  key={p.userId ?? p.pseudo}
                  player={p}
                  mode={mode}
                  onChallenge={setChallengeTarget}
                />
              ))}
            </div>
          </div>}

          {/* How it works (hidden in tournament mode) */}
          {mode !== 'tournament' && (
            <div className="glass rounded-2xl p-5 border border-white/5">
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4">Comment ça marche</p>
              <div className="space-y-3">
                {[
                  { n: '1', label: 'Ouvre la page', desc: 'Tu es visible instantanément par les autres', color: 'text-blue-400 bg-blue-500/10' },
                  { n: '2', label: 'Choisis un adversaire', desc: 'Humain ou bot, et envoie le défi', color: 'text-purple-400 bg-purple-500/10' },
                  { n: '3', label: 'Battle !', desc: 'Sélection de cartes → match animé → vol de carte', color: mode === 'duel' ? 'text-[#F5C518] bg-[#F5C518]/10' : 'text-green-400 bg-green-500/10' },
                ].map(({ n, label, desc, color }) => (
                  <div key={n} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${color}`}>{n}</div>
                    <div>
                      <p className="text-white font-bold text-xs">{label}</p>
                      <p className="text-white/30 text-[11px]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: History ─────────────────────────────────────── */}
        <div className="space-y-6 mt-6 lg:mt-0">
          {finished.length > 0 && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">⚔️ Historique Battle</p>
              <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                {finished.slice(0, 15).map((d) => {
                  const isChallenger = d.challenger_id === currentUserId
                  const iWon = d.winner_id === currentUserId
                  const myScore = isChallenger ? d.challenger_score : d.opponent_score
                  const theirScore = isChallenger ? d.opponent_score : d.challenger_score
                  const isDraw = !d.winner_id
                  const them = isChallenger ? d.opponent : d.challenger
                  const stolenCount = d.stolen_card_ids?.length ?? 0
                  return (
                    <motion.div key={d.id} whileTap={{ scale: 0.99 }}
                      onClick={() => router.push(`/battles/duel/${d.id}`)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDraw ? 'bg-white/5' : iWon ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {isDraw ? <Minus size={13} className="text-white/30" /> : iWon ? <TrendingUp size={13} className="text-green-400" /> : <TrendingDown size={13} className="text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{flag(them?.nation ?? '')} {them?.pseudo}</p>
                        <p className="text-white/30 text-xs tabular-nums flex items-center gap-1">
                          {myScore ?? 0}–{theirScore ?? 0}
                          {stolenCount > 0 && <span className={`ml-1 flex items-center gap-0.5 ${iWon ? 'text-green-500' : 'text-red-400'}`}><Gift size={9} />{iWon ? `+${stolenCount}` : `-${stolenCount}`}</span>}
                        </p>
                      </div>
                      <ChevronRight size={13} className="text-white/15 flex-shrink-0" />
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {finishedPenalty.length > 0 && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">⚽ Historique Tirs au but</p>
              <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                {finishedPenalty.slice(0, 15).map((pb) => {
                  const isChallenger = pb.challenger_id === currentUserId
                  const iWon = pb.winner_id === currentUserId
                  const myScore = isChallenger ? pb.challenger_score : pb.opponent_score
                  const theirScore = isChallenger ? pb.opponent_score : pb.challenger_score
                  const them = isChallenger ? pb.opponent : pb.challenger
                  return (
                    <motion.div key={pb.id} whileTap={{ scale: 0.99 }}
                      onClick={() => router.push(`/battles/penalty/${pb.id}`)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iWon ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {iWon ? <TrendingUp size={13} className="text-green-400" /> : <TrendingDown size={13} className="text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">⚽ {flag(them?.nation ?? '')} {them?.pseudo ?? '?'}</p>
                        <p className="text-white/30 text-xs tabular-nums">{myScore}–{theirScore} · <span className={iWon ? 'text-green-400' : 'text-red-400'}>{iWon ? 'Gagné' : 'Perdu'}</span></p>
                      </div>
                      <ChevronRight size={13} className="text-white/15 flex-shrink-0" />
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tournament history */}
          {tournaments.length > 0 && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">🏆 Historique Tournois</p>
              <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                {tournaments.slice(0, 10).filter((t) => t.semi1 && t.final).map((t) => {
                  const iWon = t.winner_slot === 0
                  const isFinalist = t.semi1!.winner === 0 && t.final!.winner !== 0
                  return (
                    <motion.div key={t.id} whileTap={{ scale: 0.99 }}
                      onClick={() => router.push(`/battles/tournament/${t.id}`)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${iWon ? 'bg-yellow-500/15' : isFinalist ? 'bg-orange-500/10' : 'bg-red-500/10'}`}>
                        {iWon ? '🏆' : isFinalist ? '🥈' : '❌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">
                          {iWon ? '1ère place' : isFinalist ? '2ème place' : 'Éliminé'}
                        </p>
                        <p className="text-white/30 text-xs tabular-nums">
                          {t.p1_pseudo} · {t.p2_pseudo} · {t.p3_pseudo}
                        </p>
                      </div>
                      {t.coins_won > 0 && (
                        <span className="text-yellow-400 text-xs font-bold flex-shrink-0">+{t.coins_won}🪙</span>
                      )}
                      <ChevronRight size={13} className="text-white/15 flex-shrink-0" />
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {finished.length === 0 && finishedPenalty.length === 0 && tournaments.length === 0 && (
            <div className="text-center py-20 lg:py-32">
              <div className="w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <Swords size={30} className="text-orange-400/50" />
              </div>
              <p className="text-white font-bold text-sm">Lance ta première battle !</p>
              <p className="text-white/30 text-xs mt-1">Rejoins le lobby et défie un adversaire</p>
            </div>
          )}
        </div>
      </div>

      {/* Challenge modal */}
      <AnimatePresence>
        {challengeTarget && (
          <ChallengeModal
            target={challengeTarget}
            mode={mode}
            onClose={() => setChallengeTarget(null)}
            onConfirm={sendChallenge}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
