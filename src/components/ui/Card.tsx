'use client'

import { motion } from 'framer-motion'
import { type Card as CardType, RARITY_COLORS, RARITY_GLOW } from '@/types'

interface CardProps {
  card: CardType
  owned?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  selected?: boolean
}

const SIZE_MAP = {
  sm: { w: 96,  h: 136, nameSize: 9,  statSize: 7,  statCount: 3 },
  md: { w: 150, h: 210, nameSize: 12, statSize: 8,  statCount: 4 },
  lg: { w: 210, h: 295, nameSize: 15, statSize: 10, statCount: 6 },
}

const PLAYER_STATS = ['pace', 'tir', 'passe', 'defense', 'dribble', 'physique'] as const
const STAT_LABELS: Record<string, string> = {
  pace: 'PAC', tir: 'TIR', passe: 'PAS', defense: 'DEF', dribble: 'DRI', physique: 'PHY'
}

const FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', Germany: '🇩🇪',
  Spain: '🇪🇸', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾', Italy: '🇮🇹',
  USA: '🇺🇸', Mexico: '🇲🇽', Canada: '🇨🇦', Morocco: '🇲🇦',
  Japan: '🇯🇵', Senegal: '🇸🇳', Switzerland: '🇨🇭', Denmark: '🇩🇰',
  'South Korea': '🇰🇷', Turkey: '🇹🇷', Ecuador: '🇪🇨', Norway: '🇳🇴',
  Sweden: '🇸🇪', Australia: '🇦🇺', Austria: '🇦🇹', Colombia: '🇨🇴',
  Tunisia: '🇹🇳', Egypt: '🇪🇬', Ghana: '🇬🇭', Paraguay: '🇵🇾',
  Panama: '🇵🇦', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Qatar: '🇶🇦', Iran: '🇮🇷',
  Algeria: '🇩🇿', Iraq: '🇮🇶', Jordan: '🇯🇴', 'Saudi Arabia': '🇸🇦',
  'South Africa': '🇿🇦', Haiti: '🇭🇹', 'Cape Verde': '🇨🇻', 'New Zealand': '🇳🇿',
  'Ivory Coast': '🇨🇮', 'Czech Republic': '🇨🇿', 'Curaçao': '🇨🇼',
  'Bosnia & Herzegovina': '🇧🇦', 'DR Congo': '🇨🇩', Uzbekistan: '🇺🇿',
}

function getFlag(nation: string | null) {
  return FLAGS[nation ?? ''] ?? '🌍'
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export function GameCard({ card, owned = true, size = 'md', onClick, selected }: CardProps) {
  const { w, h, nameSize, statSize, statCount } = SIZE_MAP[size]
  const rarityColor = RARITY_COLORS[card.rarity]
  const rarityGlow  = RARITY_GLOW[card.rarity]
  const isHolo = card.rarity === 'Epic' || card.rarity === 'Legend'
  const isPlayer = card.type === 'player'

  const visibleStats = PLAYER_STATS.slice(0, statCount)

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.06, y: -6 } : {}}
      whileTap={onClick ? { scale: 0.97 } : {}}
      className={`relative select-none rounded-xl overflow-hidden flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${selected ? 'ring-2 ring-[#F5C518]' : ''}`}
      style={{
        width: w,
        height: h,
        boxShadow: owned ? rarityGlow : 'none',
        filter: !owned ? 'grayscale(80%) brightness(0.5)' : undefined,
      }}
    >
      {/* ── Card body gradient ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(160deg, ${rarityColor}22 0%, #0c0c18 40%, #08080f 100%)`,
          border: `1.5px solid ${rarityColor}35`,
          borderRadius: 12,
        }}
      />

      {/* ── Holo shimmer ── */}
      {isHolo && owned && (
        <div className="absolute inset-0 z-10 pointer-events-none holo-effect rounded-xl opacity-25" />
      )}

      {/* ── Top rarity bar ── */}
      <div className="absolute top-0 left-0 right-0 h-[3px] z-20 rounded-t-xl"
        style={{ background: `linear-gradient(90deg, transparent, ${rarityColor}, transparent)` }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 h-full flex flex-col px-1.5 pt-1.5 pb-1">

        {/* Header row: rarity label + nation flag */}
        <div className="flex items-center justify-between mb-0.5 px-0.5">
          <span
            className="font-black uppercase tracking-widest"
            style={{ color: rarityColor, fontSize: statSize }}
          >
            {card.rarity}
          </span>
          {card.nation && (
            <span style={{ fontSize: size === 'sm' ? 10 : 13 }}>{getFlag(card.nation)}</span>
          )}
        </div>

        {/* ── Photo area ── */}
        <div
          className="relative flex-1 rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            background: isPlayer
              ? `radial-gradient(ellipse at 50% 80%, ${rarityColor}20 0%, transparent 70%)`
              : `${rarityColor}12`,
            border: `1px solid ${rarityColor}25`,
          }}
        >
          {card.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-contain"
              style={{ objectPosition: 'center bottom' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = `<span style="font-size:${size === 'sm' ? 20 : 32}px;font-weight:900;color:${rarityColor};text-shadow:0 0 16px ${rarityColor}88">${getInitials(card.name)}</span>`
                }
              }}
            />
          ) : card.type === 'nation' ? (
            <span style={{ fontSize: size === 'sm' ? 28 : 44 }}>{getFlag(card.nation)}</span>
          ) : (
            <span
              className="font-black"
              style={{
                fontSize: size === 'sm' ? 22 : 36,
                color: rarityColor,
                textShadow: `0 0 20px ${rarityColor}88`,
                fontFamily: 'Bebas Neue, sans-serif',
              }}
            >
              {getInitials(card.name)}
            </span>
          )}

          {/* Bottom shine */}
          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{ background: `linear-gradient(to top, ${rarityColor}18, transparent)` }}
          />
        </div>

        {/* ── Name ── */}
        <p
          className="font-black text-white text-center leading-tight truncate mt-1 px-0.5"
          style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: nameSize + 1, letterSpacing: '0.04em' }}
        >
          {card.name}
        </p>

        {/* ── Stats grid (player only) ── */}
        {isPlayer && card.stats && (
          <div
            className="grid mt-0.5 gap-x-1 gap-y-0"
            style={{ gridTemplateColumns: `repeat(${Math.min(statCount, 3)}, 1fr)` }}
          >
            {visibleStats.map((key) => {
              const val = card.stats?.[key]
              if (val === undefined) return null
              const num = Number(val)
              const color = num >= 85 ? '#22c55e' : num >= 70 ? '#F5C518' : num >= 55 ? '#60a5fa' : '#9ca3af'
              return (
                <div key={key} className="flex flex-col items-center">
                  <span
                    className="font-black leading-none"
                    style={{ fontSize: statSize + 1, color }}
                  >
                    {num}
                  </span>
                  <span
                    className="text-white/30 leading-none"
                    style={{ fontSize: statSize - 1 }}
                  >
                    {STAT_LABELS[key]}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Nation card: nation name */}
        {card.type === 'nation' && (
          <p
            className="text-center font-bold truncate mt-0.5"
            style={{ color: rarityColor, fontSize: statSize }}
          >
            {card.nation ?? card.name}
          </p>
        )}
      </div>

      {/* ── Locked overlay ── */}
      {!owned && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 rounded-xl">
          <svg className="w-7 h-7 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V11a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm0 2a3 3 0 013 3v3H9V6a3 3 0 013-3zm0 9a2 2 0 110 4 2 2 0 010-4z" />
          </svg>
        </div>
      )}
    </motion.div>
  )
}
