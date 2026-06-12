'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Swords, CircleDollarSign, Target, Flame, Trophy } from 'lucide-react'

interface PlayerRow {
  id: string; pseudo: string; photo_url: string | null; nation: string
  coins: number; predictions_correct: number; battles_won: number
}
interface BattleRow {
  id: string; pseudo: string; photo_url: string | null; nation: string
  battles_won: number; battles_played: number; battle_streak: number
  best_streak: number; win_rate: number; losses: number
}
interface Props {
  topCoins: PlayerRow[]; topPredictions: PlayerRow[]
  topBattles: BattleRow[]; currentUserId: string
}

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾', Italy: '🇮🇹',
  USA: '🇺🇸', Mexico: '🇲🇽', Canada: '🇨🇦', Morocco: '🇲🇦',
  Japan: '🇯🇵', Senegal: '🇸🇳',
}

const RANK_COLORS = ['#F5C518', '#C0C0C0', '#CD7F32']
const RANK_BG = ['bg-[#F5C518]/10', 'bg-white/5', 'bg-[#CD7F32]/10']
const PODIUM_HEIGHTS = ['h-24', 'h-32', 'h-20']
const PODIUM_ORDER = [1, 0, 2]
const PODIUM_RANK_LABEL = ['2', '1', '3']

function Avatar({ photo_url, pseudo, size = 'md' }: { photo_url: string | null; pseudo: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' }
  return (
    <div className={`${sizes[size]} rounded-full bg-[#F5C518]/20 border-2 border-[#F5C518]/30 flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {photo_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photo_url} alt={pseudo} className="w-full h-full object-cover" />
        : <span className="text-white font-black">{pseudo.slice(0, 1)}</span>
      }
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) return <span className="text-white/30 font-black w-6 text-center text-sm tabular-nums">{rank}</span>
  const colors = ['text-[#F5C518]', 'text-[#C0C0C0]', 'text-[#CD7F32]']
  return (
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${colors[rank - 1]}`}
      style={{ borderColor: RANK_COLORS[rank - 1] }}>
      {rank}
    </div>
  )
}

function Podium({ players }: { players: { id: string; pseudo: string; photo_url: string | null }[] }) {
  return (
    <div className="flex items-end justify-center gap-4 mb-8">
      {PODIUM_ORDER.map((playerIdx, i) => {
        const player = players[playerIdx]
        if (!player) return null
        return (
          <motion.div key={player.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} className="flex flex-col items-center gap-2">
            <Avatar photo_url={player.photo_url} pseudo={player.pseudo} size="lg" />
            <span className="text-white font-bold text-xs text-center w-20 truncate">{player.pseudo}</span>
            <div className={`w-20 ${PODIUM_HEIGHTS[i]} rounded-t-xl flex items-center justify-center ${RANK_BG[i]}`}
              style={{ border: `1px solid ${RANK_COLORS[Number(PODIUM_RANK_LABEL[i]) - 1]}30` }}>
              <span className="font-black text-lg" style={{ color: RANK_COLORS[Number(PODIUM_RANK_LABEL[i]) - 1], fontFamily: 'Bebas Neue, sans-serif' }}>
                {PODIUM_RANK_LABEL[i]}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function PlayerRowCoins({ player, rank, isCurrentUser }: { player: PlayerRow; rank: number; isCurrentUser: boolean }) {
  const flag = NATION_FLAGS[player.nation] ?? '🌍'
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(rank * 0.03, 0.5) }}
      className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors ${isCurrentUser ? 'bg-[#F5C518]/10 border border-[#F5C518]/30' : rank <= 3 ? 'bg-white/5 border border-white/5' : 'hover:bg-white/3'}`}>
      <RankBadge rank={rank} />
      <Avatar photo_url={player.photo_url} pseudo={player.pseudo} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white font-bold text-sm truncate">{player.pseudo}</span>
          {isCurrentUser && <span className="text-[#F5C518] text-xs font-bold">(toi)</span>}
        </div>
        <div className="text-white/30 text-xs flex items-center gap-1">
          <span>{flag}</span><span>{player.nation}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[#F5C518] font-black text-base tabular-nums" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {player.coins.toLocaleString()}
        </div>
        <div className="text-white/20 text-[10px] flex items-center justify-end gap-1">
          <Target size={9} className="text-violet-400" />{player.predictions_correct}
          <Swords size={9} className="text-orange-400 ml-1" />{player.battles_won}
        </div>
      </div>
    </motion.div>
  )
}

function BattlePlayerRow({ player, rank, isCurrentUser }: { player: BattleRow; rank: number; isCurrentUser: boolean }) {
  const flag = NATION_FLAGS[player.nation] ?? '🌍'
  const rateColor = player.win_rate >= 70 ? '#22c55e' : player.win_rate >= 50 ? '#F5C518' : '#ef4444'
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(rank * 0.03, 0.5) }}
      className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors ${isCurrentUser ? 'bg-[#F5C518]/10 border border-[#F5C518]/30' : rank <= 3 ? 'bg-white/5 border border-white/5' : 'hover:bg-white/3'}`}>
      <RankBadge rank={rank} />
      <Avatar photo_url={player.photo_url} pseudo={player.pseudo} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white font-bold text-sm truncate">{player.pseudo}</span>
          {isCurrentUser && <span className="text-[#F5C518] text-xs font-bold">(toi)</span>}
        </div>
        <div className="text-white/30 text-xs flex items-center gap-1">
          <span>{flag}</span>
          <span className="text-green-500">{player.battles_won}V</span>
          <span className="text-white/20">—</span>
          <span className="text-red-500">{player.losses}D</span>
          {player.battle_streak >= 3 && (
            <span className="flex items-center gap-0.5 text-orange-400 font-bold ml-1">
              <Flame size={9} />{player.battle_streak}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="font-black text-base tabular-nums" style={{ color: rateColor, fontFamily: 'Bebas Neue, sans-serif' }}>
          {player.win_rate}%
        </div>
        <div className="text-white/20 text-[10px] flex items-center justify-end gap-0.5">
          best <Flame size={9} className="text-orange-400/60" />{player.best_streak}
        </div>
      </div>
    </motion.div>
  )
}

const TABS = [
  { key: 'battles', label: 'Battles', icon: Swords },
  { key: 'coins', label: 'Coins', icon: CircleDollarSign },
  { key: 'predictions', label: 'Pronos', icon: Target },
] as const

export function LeaderboardClient({ topCoins, topPredictions, topBattles, currentUserId }: Props) {
  const [tab, setTab] = useState<'battles' | 'coins' | 'predictions'>('battles')
  const list = tab === 'coins' ? topCoins : tab === 'predictions' ? topPredictions : null
  const battleList = tab === 'battles' ? topBattles : null

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto pb-28">
      <div className="mb-6">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">WorldSquad</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center">
            <Trophy size={22} className="text-[#F5C518]" />
          </div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>CLASSEMENT</h1>
        </div>
        <p className="text-white/30 text-sm mt-2">Top 100 · Mis à jour toutes les heures</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === key ? 'bg-[#F5C518] text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/5'}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Podium */}
      {battleList && battleList.length >= 3 && <Podium players={battleList.slice(0, 3)} />}
      {list && list.length >= 3 && <Podium players={list.slice(0, 3)} />}

      {/* List */}
      <div className="space-y-1">
        {battleList?.map((player, i) => (
          <BattlePlayerRow key={player.id} player={player} rank={i + 1} isCurrentUser={player.id === currentUserId} />
        ))}
        {list?.map((player, i) => (
          <PlayerRowCoins key={player.id} player={player} rank={i + 1} isCurrentUser={player.id === currentUserId} />
        ))}
      </div>

      {((battleList ?? list ?? []).length === 0) && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-3xl bg-[#F5C518]/10 flex items-center justify-center mx-auto mb-4">
            <Trophy size={30} className="text-[#F5C518]/40" />
          </div>
          <p className="text-white/30 text-sm">Aucun joueur classé pour l&apos;instant</p>
        </div>
      )}
    </div>
  )
}
