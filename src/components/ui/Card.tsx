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
  sm: { width: 100, height: 140, fontSize: 8 },
  md: { width: 160, height: 220, fontSize: 11 },
  lg: { width: 220, height: 300, fontSize: 13 },
}

export function GameCard({ card, owned = true, size = 'md', onClick, selected }: CardProps) {
  const { width, height, fontSize } = SIZE_MAP[size]
  const rarityColor = RARITY_COLORS[card.rarity]
  const rarityGlow = RARITY_GLOW[card.rarity]
  const isHolo = card.rarity === 'Epic' || card.rarity === 'Legend'

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05, y: -4 } : {}}
      whileTap={onClick ? { scale: 0.97 } : {}}
      className={`relative cursor-pointer select-none rounded-xl overflow-hidden transition-all duration-300 ${
        selected ? 'ring-2 ring-[#F5C518]' : ''
      } ${!owned ? 'opacity-40 grayscale' : ''}`}
      style={{
        width,
        height,
        background: owned
          ? `linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)`
          : '#111',
        border: `1px solid ${rarityColor}40`,
        boxShadow: owned ? rarityGlow : 'none',
      }}
    >
      {/* Holographic overlay for Rare+ */}
      {isHolo && owned && (
        <div
          className="absolute inset-0 z-10 pointer-events-none holo-effect rounded-xl"
          style={{ opacity: 0.3 }}
        />
      )}

      {/* Rarity banner top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 z-20"
        style={{ background: rarityColor }}
      />

      {/* Card content */}
      <div className="relative z-10 h-full flex flex-col p-2">
        {/* Type badge */}
        <div className="flex justify-between items-start mb-1">
          <span
            className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: rarityColor, fontSize: fontSize - 2, background: `${rarityColor}20` }}
          >
            {card.type}
          </span>
          <span
            className="text-xs font-black uppercase"
            style={{ color: rarityColor, fontSize: fontSize - 1 }}
          >
            {card.rarity}
          </span>
        </div>

        {/* Card image / placeholder */}
        <div
          className="flex-1 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: `${rarityColor}15`, border: `1px solid ${rarityColor}30` }}
        >
          {card.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-2">
              {card.type === 'nation' ? (
                <div style={{ fontSize: size === 'sm' ? 24 : 40 }}>
                  {getNationFlag(card.nation)}
                </div>
              ) : (
                <div
                  className="font-black text-white"
                  style={{
                    fontSize: size === 'sm' ? 22 : 36,
                    textShadow: `0 0 20px ${rarityColor}`,
                  }}
                >
                  {getInitials(card.name)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card name */}
        <div className="mt-1.5">
          <p
            className="font-black text-white leading-tight truncate"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: fontSize + 2 }}
          >
            {card.name}
          </p>

          {/* Stats mini */}
          {card.stats && card.type === 'player' && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {['overall', 'vitesse', 'technique'].map((stat) =>
                card.stats[stat] !== undefined ? (
                  <span
                    key={stat}
                    className="text-xs font-bold"
                    style={{ color: rarityColor, fontSize: fontSize - 2 }}
                  >
                    {stat === 'overall' ? '' : stat.slice(0, 3).toUpperCase()}{' '}
                    {String(card.stats[stat])}
                  </span>
                ) : null
              )}
            </div>
          )}

          {card.type === 'nation' && card.stats?.force && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold" style={{ color: rarityColor, fontSize: fontSize - 1 }}>
                FORCE {String(card.stats.force)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Locked overlay */}
      {!owned && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 rounded-xl">
          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V11a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm0 2a3 3 0 013 3v3H9V6a3 3 0 013-3zm0 9a2 2 0 110 4 2 2 0 010-4z" />
          </svg>
        </div>
      )}
    </motion.div>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getNationFlag(nation: string | null): string {
  const FLAGS: Record<string, string> = {
    France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', Germany: '🇩🇪',
    Spain: '🇪🇸', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Portugal: '🇵🇹', Netherlands: '🇳🇱',
    Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾', Italy: '🇮🇹',
    USA: '🇺🇸', Mexico: '🇲🇽', Canada: '🇨🇦', Morocco: '🇲🇦',
    Japan: '🇯🇵', Senegal: '🇸🇳', Switzerland: '🇨🇭', Denmark: '🇩🇰',
  }
  return FLAGS[nation ?? ''] ?? '🌍'
}
