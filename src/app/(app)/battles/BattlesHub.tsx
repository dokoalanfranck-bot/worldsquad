'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Swords, ChevronRight, Search, Layers, Radio, Gift,
  TrendingUp, TrendingDown, Minus, Check, X, Clock, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Profile { id: string | null; pseudo: string; nation: string; photo_url: string | null }
interface Duel {
  id: string; status: string; is_bot: boolean; is_friend_battle: boolean; bot_name: string | null
  challenger_score: number | null; opponent_score: number | null
  winner_id: string | null; coins_stake: number; stake_count: number
  stolen_card_ids: string[] | null; created_at: string
  challenger_id: string; opponent_id: string | null
  challenger: Profile; opponent: Profile
}

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

const HOW_IT_WORKS = [
  { icon: Search, label: 'Matchmaking', desc: 'Adversaire humain en 50s, bot sinon', accent: 'bg-blue-500/10 text-blue-400' },
  { icon: Layers, label: 'Sélection', desc: '4 joueurs + GK + Coach · 45 secondes', accent: 'bg-violet-500/10 text-violet-400' },
  { icon: Radio, label: 'Match live', desc: 'Simulation animée · 30 secondes', accent: 'bg-red-500/10 text-red-400' },
  { icon: Gift, label: 'Vol de carte', desc: 'Choisis les cartes à voler parmi les picks adverses', accent: 'bg-amber-500/10 text-amber-400' },
]

export function BattlesHub({ duels, currentUserId }: { duels: Duel[]; currentUserId: string }) {
  const router = useRouter()
  const [searching, setSearching] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function findDuel() {
    setSearching(true)
    try {
      const res = await fetch('/api/duels/find', { method: 'POST' })
      const data = await res.json() as { duelId?: string; error?: string }
      if (!res.ok || !data.duelId) { toast.error(data.error ?? 'Erreur lors de la recherche'); return }
      router.push(`/battles/duel/${data.duelId}`)
    } catch { toast.error('Erreur réseau') }
    finally { setSearching(false) }
  }

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

  async function cancelDuel(duelId: string) {
    setCancelling(duelId)
    try {
      const res = await fetch(`/api/duels/${duelId}/cancel`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Impossible d\'annuler'); return }
      router.refresh()
    } catch { toast.error('Erreur réseau') }
    finally { setCancelling(null) }
  }

  const invitedDuels  = duels.filter((d) => d.status === 'invited' && d.opponent_id === currentUserId)
  const activeDuels   = duels.filter((d) => ['open', 'picking', 'stealing'].includes(d.status))
  const finished      = duels.filter((d) => d.status === 'finished')

  return (
    <div className="min-h-screen px-4 lg:px-8 py-6 max-w-2xl lg:max-w-5xl mx-auto pb-28">

      {/* Header */}
      <div className="mb-8">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">WorldSquad</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center">
            <Swords size={22} className="text-orange-400" />
          </div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>DUELS</h1>
        </div>
        <p className="text-white/30 text-sm mt-2 ml-0.5">4 joueurs + GK + Coach · Vole les cartes adverses</p>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

        {/* Left col: CTA + Invitations + Active + How it works */}
        <div>
          {/* Pending invitations */}
          {invitedDuels.length > 0 && (
            <div className="mb-5">
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Défis reçus</p>
              <div className="space-y-2">
                {invitedDuels.map((d) => {
                  const them = d.challenger
                  return (
                    <motion.div key={d.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-2xl p-4 border border-[#C8102E]/30">
                      <div className="flex items-center gap-3 mb-3">
                        <Users size={16} className="text-[#C8102E]" />
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm">{flag(them.nation)} {them.pseudo}</p>
                          <p className="text-gray-500 text-xs">Mise : {d.stake_count ?? 1} carte{(d.stake_count ?? 1) > 1 ? 's' : ''}</p>
                        </div>
                        <span className="text-[#C8102E] text-xs font-bold uppercase">Défi !</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptInvite(d.id)} disabled={accepting === d.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500/15 text-green-400 rounded-xl text-sm font-bold disabled:opacity-50">
                          <Check size={14} /> Accepter
                        </button>
                        <button onClick={() => declineInvite(d.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-sm font-bold">
                          <X size={14} /> Refuser
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active duels */}
          {activeDuels.length > 0 && (
            <div className="mb-5">
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">En cours</p>
              <div className="space-y-2">
                {activeDuels.map((d) => {
                  const isChallenger = d.challenger_id === currentUserId
                  const them = isChallenger ? d.opponent : d.challenger
                  const statusLabel = d.status === 'open' ? 'Recherche…' : d.status === 'picking' ? 'Sélection' : 'Vol en cours'
                  const canCancel = d.status === 'open' || d.status === 'picking'
                  return (
                    <motion.div key={d.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-2xl p-4 border border-[#F5C518]/25 flex items-center gap-3">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => router.push(`/battles/duel/${d.id}`)}>
                        <span className="w-2 h-2 rounded-full bg-[#F5C518] animate-pulse flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[#F5C518] text-xs font-black uppercase tracking-wider">{statusLabel}</p>
                          <p className="text-white font-bold text-sm mt-0.5 truncate">vs {them?.pseudo ?? '…'}</p>
                        </div>
                        <ChevronRight size={16} className="text-[#F5C518] flex-shrink-0" />
                      </div>
                      {canCancel && (
                        <button
                          onClick={() => cancelDuel(d.id)}
                          disabled={cancelling === d.id}
                          className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0 disabled:opacity-40"
                        >
                          {cancelling === d.id
                            ? <div className="w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                            : <X size={14} />
                          }
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Main CTA */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={findDuel}
            disabled={searching}
            className="w-full relative overflow-hidden bg-[#F5C518] text-black font-black py-5 rounded-2xl text-2xl flex items-center justify-center gap-3 shadow-2xl shadow-yellow-500/25 disabled:opacity-70 mb-8"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            animate={!searching ? { boxShadow: ['0 0 24px rgba(245,197,24,0.2)', '0 0 40px rgba(245,197,24,0.5)', '0 0 24px rgba(245,197,24,0.2)'] } : {}}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            {searching ? (
              <><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> RECHERCHE…</>
            ) : (
              <><Swords size={24} /> TROUVER UN DUEL</>
            )}
          </motion.button>

          {/* How it works */}
          <div className="glass rounded-2xl p-5 border border-white/5">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4">Comment ça marche</p>
            <div className="grid grid-cols-2 gap-3">
              {HOW_IT_WORKS.map(({ icon: Icon, label, desc, accent }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
                    <Icon size={15} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xs">{label}</p>
                    <p className="text-white/30 text-[11px] leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col: History */}
        <div>
          {finished.length > 0 ? (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3 mt-8 lg:mt-0">Historique</p>
              <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                {finished.map((d) => {
                  const isChallenger = d.challenger_id === currentUserId
                  const iWon = d.winner_id === currentUserId
                  const myScore = isChallenger ? d.challenger_score : d.opponent_score
                  const theirScore = isChallenger ? d.opponent_score : d.challenger_score
                  const isDraw = !d.winner_id && (myScore ?? 0) === (theirScore ?? 0)
                  const them = isChallenger ? d.opponent : d.challenger
                  const stolenCount = d.stolen_card_ids?.length ?? 0

                  return (
                    <motion.div
                      key={d.id}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => router.push(`/battles/duel/${d.id}`)}
                      className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/3 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isDraw ? 'bg-white/5' : iWon ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {isDraw
                          ? <Minus size={15} className="text-white/30" />
                          : iWon
                            ? <TrendingUp size={15} className="text-green-400" />
                            : <TrendingDown size={15} className="text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">
                          {flag(them?.nation ?? '')} {them?.pseudo}
                          {d.is_friend_battle && <span className="ml-1 text-[10px] text-blue-400">amis</span>}
                        </p>
                        <p className="text-white/30 text-xs mt-0.5 tabular-nums flex items-center gap-1">
                          {myScore ?? 0} — {theirScore ?? 0}
                          {stolenCount > 0 && (
                            <span className={`ml-1 flex items-center gap-0.5 ${iWon ? 'text-green-500' : 'text-red-400'}`}>
                              <Gift size={10} />
                              {iWon ? `+${stolenCount}` : `-${stolenCount}`}
                            </span>
                          )}
                        </p>
                      </div>
                      {d.status === 'stealing' && (
                        <span className="text-[#F5C518] text-xs font-bold flex items-center gap-1">
                          <Clock size={10} /> Vol
                        </span>
                      )}
                      <ChevronRight size={14} className="text-white/15 flex-shrink-0" />
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 lg:py-24">
              <div className="w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <Swords size={30} className="text-orange-400/50" />
              </div>
              <p className="text-white font-bold text-sm">Ton premier duel t'attend !</p>
              <p className="text-white/30 text-xs mt-1">Lance-toi et défie un adversaire</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
