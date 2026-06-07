'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface PlayerRow {
  id: string
  pseudo: string
  photo_url: string | null
  nation: string
  coins: number
  predictions_correct: number
  battles_won: number
}

interface Props {
  topCoins: PlayerRow[]
  topPredictions: PlayerRow[]
  currentUserId: string
}

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾', Italy: '🇮🇹',
  USA: '🇺🇸', Mexico: '🇲🇽', Canada: '🇨🇦', Morocco: '🇲🇦',
  Japan: '🇯🇵', Senegal: '🇸🇳',
}

const RANK_COLORS = ['#F5C518', '#C0C0C0', '#CD7F32']

function RankMedal({ rank }: { rank: number }) {
  if (rank > 3) return <span className="text-gray-500 font-bold w-6 text-center text-sm">{rank}</span>
  return (
    <span className="text-xl w-6 text-center">
      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
    </span>
  )
}

function PlayerRow({ player, rank, isCurrentUser }: { player: PlayerRow; rank: number; isCurrentUser: boolean }) {
  const flag = NATION_FLAGS[player.nation] ?? '🌍'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.5) }}
      className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors ${
        isCurrentUser
          ? 'bg-[#F5C518]/10 border border-[#F5C518]/30'
          : rank <= 3
          ? 'bg-white/5 border border-white/5'
          : 'hover:bg-white/3'
      }`}
    >
      <RankMedal rank={rank} />

      <div className="w-8 h-8 rounded-full bg-[#F5C518]/20 flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0">
        {player.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photo_url} alt={player.pseudo} className="w-full h-full object-cover" />
        ) : (
          player.pseudo.slice(0, 1).toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white font-bold text-sm truncate">{player.pseudo}</span>
          {isCurrentUser && <span className="text-[#F5C518] text-xs font-bold">(toi)</span>}
        </div>
        <div className="text-gray-600 text-xs flex items-center gap-1">
          <span>{flag}</span>
          <span>{player.nation}</span>
        </div>
      </div>

      <div className="text-right">
        <div className="text-[#F5C518] font-black" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {player.coins.toLocaleString()} 🪙
        </div>
        <div className="text-gray-600 text-xs">
          ✅ {player.predictions_correct} · ⚔️ {player.battles_won}
        </div>
      </div>
    </motion.div>
  )
}

export function LeaderboardClient({ topCoins, topPredictions, currentUserId }: Props) {
  const [tab, setTab] = useState<'coins' | 'predictions'>('coins')

  const list = tab === 'coins' ? topCoins : topPredictions
  const currentUserRank = list.findIndex((p) => p.id === currentUserId) + 1

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          CLASSEMENT MONDIAL
        </h1>
        <p className="text-gray-500 text-sm">Top 100 joueurs · Mis à jour toutes les heures</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['coins', 'predictions'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
              tab === t ? 'bg-[#F5C518] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
            }`}
          >
            {t === 'coins' ? '🪙 Par Coins' : '⚽ Par Pronostics'}
          </button>
        ))}
      </div>

      {/* Your rank if not in top 100 */}
      {currentUserRank === 0 && (
        <div className="glass rounded-xl p-3 mb-4 text-center text-sm text-gray-500">
          Tu n&apos;es pas encore dans le Top 100
        </div>
      )}

      {/* Top 3 podium */}
      {list.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8">
          {[list[1], list[0], list[2]].map((player, i) => {
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3
            const heights = ['h-24', 'h-32', 'h-20']
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#F5C518]/20 border-2 border-[#F5C518]/40 flex items-center justify-center overflow-hidden">
                  {player.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.photo_url} alt={player.pseudo} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black">{player.pseudo.slice(0, 1)}</span>
                  )}
                </div>
                <span className="text-white font-bold text-xs text-center leading-tight max-w-16 truncate">{player.pseudo}</span>
                <div
                  className={`w-20 ${heights[i]} rounded-t-lg flex items-center justify-center`}
                  style={{ background: `${RANK_COLORS[rank - 1]}20`, border: `1px solid ${RANK_COLORS[rank - 1]}40` }}
                >
                  <span className="text-2xl">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Full leaderboard */}
      <div className="space-y-1">
        {list.map((player, i) => (
          <PlayerRow
            key={player.id}
            player={player}
            rank={i + 1}
            isCurrentUser={player.id === currentUserId}
          />
        ))}
      </div>
    </div>
  )
}
