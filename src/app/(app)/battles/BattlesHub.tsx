'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Trophy, Clock, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Profile { id: string | null; pseudo: string; nation: string; photo_url: string | null }
interface RewardCard { id: string; name: string; rarity: string; image_url: string | null }
interface Duel {
  id: string; status: string; is_bot: boolean; bot_name: string | null
  challenger_score: number | null; opponent_score: number | null
  winner_id: string | null; coins_stake: number; created_at: string
  challenger_id: string; opponent_id: string | null
  challenger: Profile; opponent: Profile; reward_card: RewardCard | null
}

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

const RARITY_COLORS: Record<string, string> = {
  Legend: '#F5C518', Epic: '#a855f7', Rare: '#3b82f6', Common: '#6b7280',
}

export function BattlesHub({ duels, currentUserId }: { duels: Duel[]; currentUserId: string }) {
  const router = useRouter()
  const [searching, setSearching] = useState(false)

  async function findDuel() {
    setSearching(true)
    try {
      const res = await fetch('/api/duels/find', { method: 'POST' })
      const data = await res.json() as { duelId?: string; error?: string }
      if (!res.ok || !data.duelId) {
        toast.error(data.error ?? 'Erreur lors de la recherche')
        return
      }
      router.push(`/battles/duel/${data.duelId}`)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSearching(false)
    }
  }

  const activeDuel = duels.find((d) => d.status === 'open' || d.status === 'picking')

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">WorldSquad</p>
        <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          DUELS ⚔️
        </h1>
        <p className="text-gray-500 text-sm mt-1">3 joueurs · 1 coach · Match 22s · Vol de carte</p>
      </div>

      {/* Resume active duel */}
      {activeDuel && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-4 mb-5 border border-[#F5C518]/20 cursor-pointer"
          onClick={() => router.push(`/battles/duel/${activeDuel.id}`)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#F5C518] text-xs font-bold uppercase tracking-wider">Duel en cours</p>
              <p className="text-white font-bold text-sm mt-0.5">
                vs {activeDuel.opponent?.pseudo ?? '…'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F5C518] animate-pulse" />
              <ChevronRight size={16} className="text-[#F5C518]" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Main CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={findDuel}
        disabled={searching}
        className="w-full relative overflow-hidden bg-[#F5C518] text-black font-black py-5 rounded-2xl text-2xl flex items-center justify-center gap-3 shadow-2xl shadow-yellow-500/30 disabled:opacity-70 mb-8"
        style={{ fontFamily: 'Bebas Neue, sans-serif' }}
      >
        {searching ? (
          <>
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            RECHERCHE…
          </>
        ) : (
          <>
            <Swords size={24} /> TROUVER UN DUEL
          </>
        )}
      </motion.button>

      {/* How it works */}
      <div className="glass rounded-2xl p-4 mb-8">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Comment ça marche</p>
        <div className="space-y-3">
          {[
            { icon: '🔍', label: 'Matchmaking', desc: 'Adversaire humain en 20s, bot sinon' },
            { icon: '🃏', label: 'Sélection', desc: '3 joueurs + 1 coach · 45 secondes' },
            { icon: '⚽', label: 'Match live', desc: 'Simulation animée · 22 secondes' },
            { icon: '🎴', label: 'Vol de carte', desc: 'Le gagnant vole la meilleure carte adverse' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xl w-7 text-center">{s.icon}</span>
              <div>
                <p className="text-white font-bold text-xs">{s.label}</p>
                <p className="text-gray-600 text-xs">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {duels.filter((d) => d.status === 'finished').length > 0 && (
        <div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Historique</p>
          <div className="space-y-2">
            {duels.filter((d) => d.status === 'finished').map((d) => {
              const isChallenger = d.challenger_id === currentUserId
              const iWon = d.winner_id === currentUserId
              const isDraw = !d.winner_id
              const myScore = isChallenger ? d.challenger_score : d.opponent_score
              const theirScore = isChallenger ? d.opponent_score : d.challenger_score
              const them = isChallenger ? d.opponent : d.challenger

              return (
                <motion.div
                  key={d.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => router.push(`/battles/duel/${d.id}`)}
                  className={`glass rounded-xl p-3.5 flex items-center gap-3 border cursor-pointer ${
                    isDraw ? 'border-white/5' : iWon ? 'border-green-500/20' : 'border-red-500/15'
                  }`}
                >
                  <div className="text-xl">{isDraw ? '🤝' : iWon ? '🏆' : '💔'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">vs {them?.pseudo}</p>
                    <p className="text-gray-600 text-xs">
                      {flag(them?.nation)} {myScore ?? 0} — {theirScore ?? 0}
                    </p>
                  </div>
                  {d.reward_card && (
                    <div className="text-right">
                      <p className="text-xs" style={{ color: RARITY_COLORS[d.reward_card.rarity] ?? '#6b7280' }}>
                        {iWon ? '▲' : '▼'} {d.reward_card.name}
                      </p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {duels.length === 0 && (
        <div className="text-center py-12">
          <p className="text-6xl mb-4">⚔️</p>
          <p className="text-gray-500 text-sm">Ton premier duel t'attend !</p>
        </div>
      )}
    </div>
  )
}
