'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Target, Flame, Trophy, Layers, Check, X, Coins } from 'lucide-react'

interface BattleRow {
  id: string; pseudo: string; photo_url: string | null; nation: string
  battles_won: number; battles_played: number; battle_streak: number
  best_streak: number; losses: number
}
interface PredRow {
  id: string; pseudo: string; photo_url: string | null; nation: string
  predictions_correct: number; predictions_wrong: number; predictions_total: number
}
interface CardRow {
  id: string; pseudo: string; photo_url: string | null; nation: string
  total_cards: number; unique_cards: number
}
interface Props {
  topPredictions: PredRow[]
  topBattles: BattleRow[]
  topCards: CardRow[]
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
const RANK_BG = ['bg-[#F5C518]/10', 'bg-white/5', 'bg-[#CD7F32]/10']
const PODIUM_HEIGHTS = ['h-24', 'h-32', 'h-20']
const PODIUM_ORDER = [1, 0, 2]
const PODIUM_RANK_LABEL = ['2', '1', '3']
const PRIZE_COINS = [300, 200, 100] as const
const PRIZE_EMOJI = ['👑', '🥈', '🥉']

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

function PrizePoolBanner({ currentUserRank, countdown }: { currentUserRank: number; countdown: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #150e00 0%, #231800 50%, #150e00 100%)', border: '1px solid rgba(245,197,24,0.25)' }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <p className="text-[#F5C518] font-black text-sm leading-none" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                RÉCOMPENSES QUOTIDIENNES
              </p>
              <p className="text-white/30 text-[10px] mt-0.5">Top 3 battles · distribué chaque 24h</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/25 text-[9px] uppercase tracking-wider">Prochain versement</p>
            <p className="text-[#F5C518] font-black tabular-nums text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {countdown || '-- : -- : --'}
            </p>
          </div>
        </div>

        {/* Prize boxes */}
        <div className="flex gap-2">
          {PRIZE_COINS.map((coins, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              className="flex-1 rounded-xl p-2.5 text-center"
              style={{
                background: i === 0 ? 'rgba(245,197,24,0.08)' : i === 1 ? 'rgba(255,255,255,0.04)' : 'rgba(205,127,50,0.08)',
                border: `1px solid ${RANK_COLORS[i]}25`,
              }}
            >
              <p className="text-lg leading-none mb-1">{PRIZE_EMOJI[i]}</p>
              <p className="font-black text-base leading-none" style={{ color: RANK_COLORS[i], fontFamily: 'Bebas Neue, sans-serif' }}>
                +{coins}
              </p>
              <p className="text-white/30 text-[9px] mt-0.5">coins</p>
            </motion.div>
          ))}
        </div>

        {/* Personal message if user is top 3 */}
        <AnimatePresence>
          {currentUserRank >= 1 && currentUserRank <= 3 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="px-3 py-2 rounded-xl overflow-hidden"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <p className="text-green-400 text-xs font-bold flex items-center gap-1.5">
                <span>✦</span>
                Tu es #{currentUserRank} — tu recevras{' '}
                <span className="text-[#F5C518]">+{PRIZE_COINS[currentUserRank - 1]} coins</span>{' '}
                dans {countdown}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Podium({ players, showPrizes }: { players: { id: string; pseudo: string; photo_url: string | null }[]; showPrizes?: boolean }) {
  return (
    <div className="flex items-end justify-center gap-4 mb-8">
      {PODIUM_ORDER.map((playerIdx, i) => {
        const player = players[playerIdx]
        if (!player) return null
        const rankNum = Number(PODIUM_RANK_LABEL[i])
        return (
          <motion.div key={player.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} className="flex flex-col items-center gap-2">
            {showPrizes && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + 0.1 * i, type: 'spring' }}
                className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                style={{ color: RANK_COLORS[rankNum - 1], background: `${RANK_COLORS[rankNum - 1]}18`, border: `1px solid ${RANK_COLORS[rankNum - 1]}30` }}
              >
                +{PRIZE_COINS[rankNum - 1]}
              </motion.span>
            )}
            <Avatar photo_url={player.photo_url} pseudo={player.pseudo} size="lg" />
            <span className="text-white font-bold text-xs text-center w-20 truncate">{player.pseudo}</span>
            <div className={`w-20 ${PODIUM_HEIGHTS[i]} rounded-t-xl flex items-center justify-center ${RANK_BG[i]}`}
              style={{ border: `1px solid ${RANK_COLORS[rankNum - 1]}30` }}>
              <span className="font-black text-lg" style={{ color: RANK_COLORS[rankNum - 1], fontFamily: 'Bebas Neue, sans-serif' }}>
                {PODIUM_RANK_LABEL[i]}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function BattlePlayerRow({ player, rank, isCurrentUser }: { player: BattleRow; rank: number; isCurrentUser: boolean }) {
  const flag = NATION_FLAGS[player.nation] ?? '🌍'
  const prize = rank <= 3 ? PRIZE_COINS[rank - 1] : null
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
        <div className="text-white/30 text-xs flex items-center gap-1.5 mt-0.5">
          <span>{flag}</span>
          <span className="text-white/20">{player.battles_played} joués</span>
          {player.battle_streak >= 3 && (
            <span className="flex items-center gap-0.5 text-orange-400 font-bold">
              <Flame size={9} />{player.battle_streak}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex items-center gap-2">
        {prize && (
          <div className="flex flex-col items-center px-2 py-1 rounded-lg" style={{ background: `${RANK_COLORS[rank - 1]}12`, border: `1px solid ${RANK_COLORS[rank - 1]}25` }}>
            <span className="text-[9px] leading-none" style={{ color: RANK_COLORS[rank - 1] }}>+{prize}</span>
            <span className="text-[8px] text-white/20 leading-none">coins/j</span>
          </div>
        )}
        <div>
          <div className="font-black text-lg tabular-nums text-[#F5C518]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {player.battles_won} <span className="text-xs text-white/30 font-normal">victoires</span>
          </div>
          <div className="text-white/30 text-[10px] flex items-center justify-end gap-1 mt-0.5">
            <span className="text-green-500">{player.battles_won}V</span>
            <span className="text-white/20">·</span>
            <span className="text-red-500">{player.losses}D</span>
            {player.best_streak > 0 && (
              <span className="ml-1 flex items-center gap-0.5 text-orange-400/60">
                best <Flame size={8} />{player.best_streak}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PredPlayerRow({ player, rank, isCurrentUser }: { player: PredRow; rank: number; isCurrentUser: boolean }) {
  const flag = NATION_FLAGS[player.nation] ?? '🌍'
  const total = player.predictions_total
  const correctPct = total > 0 ? Math.round((player.predictions_correct / total) * 100) : 0
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
        <div className="text-white/30 text-xs flex items-center gap-1.5 mt-0.5">
          <span>{flag}</span>
          <span className="flex items-center gap-0.5 text-green-500">
            <Check size={9} />{player.predictions_correct}
          </span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-0.5 text-red-400">
            <X size={9} />{player.predictions_wrong}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-black text-lg tabular-nums text-[#F5C518]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {player.predictions_correct} <span className="text-xs text-white/30 font-normal">corrects</span>
        </div>
        <div className="text-white/30 text-[10px] mt-0.5">
          {total > 0 ? `${correctPct}% sur ${total} pronos` : 'aucun prono'}
        </div>
      </div>
    </motion.div>
  )
}

function CardPlayerRow({ player, rank, isCurrentUser }: { player: CardRow; rank: number; isCurrentUser: boolean }) {
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
        <div className="text-white/30 text-xs flex items-center gap-1 mt-0.5">
          <span>{flag}</span><span>{player.nation}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-black text-lg tabular-nums text-[#F5C518]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {player.total_cards} <span className="text-xs text-white/30 font-normal">cartes</span>
        </div>
        <div className="text-white/20 text-[10px] mt-0.5">{player.unique_cards} uniques</div>
      </div>
    </motion.div>
  )
}

const TABS = [
  { key: 'battles', label: 'Battles', icon: Swords },
  { key: 'cards', label: 'Cartes', icon: Layers },
  { key: 'predictions', label: 'Pronos', icon: Target },
] as const

export function LeaderboardClient({ topPredictions, topBattles, topCards, currentUserId }: Props) {
  const [tab, setTab] = useState<'battles' | 'cards' | 'predictions'>('battles')
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setUTCHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  const currentUserBattleRank = topBattles.findIndex((p) => p.id === currentUserId) + 1

  const podiumList =
    tab === 'battles' ? topBattles :
    tab === 'cards' ? topCards :
    topPredictions

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

      {/* Prize pool banner — battles only */}
      {tab === 'battles' && (
        <PrizePoolBanner currentUserRank={currentUserBattleRank} countdown={countdown} />
      )}

      {/* Podium */}
      {podiumList.length >= 3 && <Podium players={podiumList.slice(0, 3)} showPrizes={tab === 'battles'} />}

      {/* List */}
      <div className="space-y-1">
        {tab === 'battles' && topBattles.map((player, i) => (
          <BattlePlayerRow key={player.id} player={player} rank={i + 1} isCurrentUser={player.id === currentUserId} />
        ))}
        {tab === 'predictions' && topPredictions.map((player, i) => (
          <PredPlayerRow key={player.id} player={player} rank={i + 1} isCurrentUser={player.id === currentUserId} />
        ))}
        {tab === 'cards' && topCards.map((player, i) => (
          <CardPlayerRow key={player.id} player={player} rank={i + 1} isCurrentUser={player.id === currentUserId} />
        ))}
      </div>

      {podiumList.length === 0 && (
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
