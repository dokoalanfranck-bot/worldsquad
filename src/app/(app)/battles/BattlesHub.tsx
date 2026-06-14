'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Swords, ChevronRight, Search, Layers, Radio, CreditCard,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
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

const HOW_IT_WORKS = [
  { icon: Search, label: 'Matchmaking', desc: 'Adversaire humain en 50s, bot sinon', accent: 'bg-blue-500/10 text-blue-400' },
  { icon: Layers, label: 'Sélection', desc: '3 joueurs + 1 coach · 45 secondes', accent: 'bg-violet-500/10 text-violet-400' },
  { icon: Radio, label: 'Match live', desc: 'Simulation animée · 1 minute', accent: 'bg-red-500/10 text-red-400' },
  { icon: CreditCard, label: 'Vol de carte', desc: 'Le gagnant vole la meilleure carte adverse', accent: 'bg-amber-500/10 text-amber-400' },
]

export function BattlesHub({ duels, currentUserId }: { duels: Duel[]; currentUserId: string }) {
  const router = useRouter()
  const [searching, setSearching] = useState(false)

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

  const activeDuel = duels.find((d) => d.status === 'open' || d.status === 'picking')
  const finished = duels.filter((d) => d.status === 'finished')

  return (
    <div className="min-h-screen px-4 lg:px-8 py-6 max-w-2xl lg:max-w-5xl mx-auto pb-28">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">WorldSquad</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center">
            <Swords size={22} className="text-orange-400" />
          </div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            DUELS
          </h1>
        </div>
        <p className="text-white/30 text-sm mt-2 ml-0.5">3 joueurs + 1 coach · Vole la carte adverse</p>
      </div>

      {/* ── Desktop: 2-column layout ─────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

        {/* ── Left col: CTA + How it works ───────────────────────────────── */}
        <div>
          {/* Resume active duel */}
          {activeDuel && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-4 mb-5 border border-[#F5C518]/25 cursor-pointer"
              onClick={() => router.push(`/battles/duel/${activeDuel.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#F5C518] animate-pulse" />
                  <div>
                    <p className="text-[#F5C518] text-xs font-black uppercase tracking-wider">Duel en cours</p>
                    <p className="text-white font-bold text-sm mt-0.5">vs {activeDuel.opponent?.pseudo ?? '…'}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#F5C518]" />
              </div>
            </motion.div>
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

        {/* ── Right col: History ─────────────────────────────────────────── */}
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
                          {d.is_bot && <span className="ml-1.5 text-[10px] text-white/30 font-normal">Bot</span>}
                        </p>
                        <p className="text-white/30 text-xs mt-0.5 tabular-nums">
                          {myScore ?? 0} — {theirScore ?? 0}
                        </p>
                      </div>
                      {d.reward_card && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold" style={{ color: RARITY_COLORS[d.reward_card.rarity] ?? '#6b7280' }}>
                            {iWon ? '▲' : '▼'} {d.reward_card.name}
                          </p>
                        </div>
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

      </div>{/* end 2-col grid */}
    </div>
  )
}
