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

interface BattleRow {
  id: string
  pseudo: string
  photo_url: string | null
  nation: string
  battles_won: number
  battles_played: number
  battle_streak: number
  best_streak: number
  win_rate: number
  losses: number
}

interface Props {
  topCoins: PlayerRow[]
  topPredictions: PlayerRow[]
  topBattles: BattleRow[]
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

function Avatar({ photo_url, pseudo }: { photo_url: string | null; pseudo: string }) {
  return (
    <div className="w-12 h-12 rounded-full bg-[#F5C518]/20 border-2 border-[#F5C518]/40 flex items-center justify-center overflow-hidden">
      {photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo_url} alt={pseudo} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-black text-lg">{pseudo.slice(0, 1)}</span>
      )}
    </div>
  )
}

function Podium({ players }: { players: { id: string; pseudo: string; photo_url: string | null }[] }) {
  const order = [players[1], players[0], players[2]]
  const heights = ['h-24', 'h-32', 'h-20']
  const ranks = [2, 1, 3]
  const medals = ['🥈', '🥇', '🥉']

  return (
    <div className="flex items-end justify-center gap-4 mb-8">
      {order.map((player, i) => (
        <motion.div
          key={player.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * i }}
          className="flex flex-col items-center gap-2"
        >
          <Avatar photo_url={player.photo_url} pseudo={player.pseudo} />
          <span className="text-white font-bold text-xs text-center leading-tight w-20 truncate">{player.pseudo}</span>
          <div
            className={`w-20 ${heights[i]} rounded-t-lg flex items-center justify-center`}
            style={{ background: `${RANK_COLORS[ranks[i] - 1]}20`, border: `1px solid ${RANK_COLORS[ranks[i] - 1]}40` }}
          >
            <span className="text-2xl">{medals[i]}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

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

function BattlePlayerRow({ player, rank, isCurrentUser }: { player: BattleRow; rank: number; isCurrentUser: boolean }) {
  const flag = NATION_FLAGS[player.nation] ?? '🌍'
  const rateColor = player.win_rate >= 70 ? '#22c55e' : player.win_rate >= 50 ? '#F5C518' : '#ef4444'

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
          <span className="text-green-500">{player.battles_won}V</span>
          <span className="text-gray-600">—</span>
          <span className="text-red-500">{player.losses}D</span>
          {player.battle_streak >= 3 && (
            <span className="text-orange-400 font-bold ml-1">🔥 {player.battle_streak}</span>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="font-black text-base" style={{ color: rateColor, fontFamily: 'Bebas Neue, sans-serif' }}>
          {player.win_rate}%
        </div>
        <div className="text-gray-600 text-xs">
          {player.battles_played} matchs · best {player.best_streak}🔥
        </div>
      </div>
    </motion.div>
  )
}

export function LeaderboardClient({ topCoins, topPredictions, topBattles, currentUserId }: Props) {
  const [tab, setTab] = useState<'battles' | 'coins' | 'predictions'>('battles')

  const list = tab === 'coins' ? topCoins : tab === 'predictions' ? topPredictions : null
  const battleList = tab === 'battles' ? topBattles : null
  const currentUserRank = list ? list.findIndex((p) => p.id === currentUserId) + 1
    : topBattles.findIndex((p) => p.id === currentUserId) + 1

  const TABS = [
    { key: 'battles', label: '⚔️ Battles' },
    { key: 'coins',   label: '🪙 Coins' },
    { key: 'predictions', label: '⚽ Pronos' },
  ] as const

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto pb-28">
      <div className="mb-6">
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">WorldSquad</p>
        <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          CLASSEMENT
        </h1>
        <p className="text-gray-500 text-sm mt-1">Top 100 · Mis à jour toutes les heures</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              tab === t.key
                ? 'bg-[#F5C518] text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Current user rank banner if not in top list */}
      {currentUserRank === 0 && (
        <div className="glass rounded-xl p-3 mb-4 text-center text-sm text-gray-500">
          Tu n&apos;es pas encore classé dans le Top 100
        </div>
      )}

      {/* Podium top 3 */}
      {battleList && battleList.length >= 3 && (
        <Podium players={battleList.slice(0, 3)} />
      )}
      {list && list.length >= 3 && (
        <Podium players={list.slice(0, 3)} />
      )}

      {/* Leaderboard list */}
      <div className="space-y-1">
        {battleList && battleList.map((player, i) => (
          <BattlePlayerRow
            key={player.id}
            player={player}
            rank={i + 1}
            isCurrentUser={player.id === currentUserId}
          />
        ))}
        {list && list.map((player, i) => (
          <PlayerRow
            key={player.id}
            player={player}
            rank={i + 1}
            isCurrentUser={player.id === currentUserId}
          />
        ))}
      </div>

      {((battleList ?? list ?? []).length === 0) && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">⚔️</p>
          <p className="text-gray-500 text-sm">Aucun joueur classé pour l&apos;instant</p>
        </div>
      )}
    </div>
  )
}
