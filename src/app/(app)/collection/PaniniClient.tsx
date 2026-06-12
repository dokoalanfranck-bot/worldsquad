'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Grid3x3, BookOpen } from 'lucide-react'
import { RARITY_COLORS } from '@/types'
import type { Card } from '@/types'
import Link from 'next/link'

interface NationGroup {
  nation: string
  flag: string
  cards: Card[]
  ownedCount: number
}

interface Props {
  nationGroups: NationGroup[]
  ownedIds: string[]
  totalCards: number
}

const FLAG_MAP: Record<string, string> = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czech Republic': '🇨🇿',
  'Canada': '🇨🇦', 'Bosnia & Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷', 'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turkey': '🇹🇷',
  'Germany': '🇩🇪', 'Curaçao': '🇨🇼', 'Ivory Coast': '🇨🇮', 'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Sweden': '🇸🇪', 'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
  'Spain': '🇪🇸', 'Cape Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾',
  'France': '🇫🇷', 'Senegal': '🇸🇳', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Argentina': '🇦🇷', 'Algeria': '🇩🇿', 'Austria': '🇦🇹', 'Jordan': '🇯🇴',
  'Portugal': '🇵🇹', 'DR Congo': '🇨🇩', 'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Ghana': '🇬🇭', 'Panama': '🇵🇦',
}

function getFlag(nation: string): string {
  return FLAG_MAP[nation] ?? '🏳'
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function Sticker({ card, owned }: { card: Card; owned: boolean }) {
  const color = RARITY_COLORS[card.rarity] ?? '#888'
  const isLegend = card.rarity === 'Legend'
  const isEpic = card.rarity === 'Epic'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col rounded-lg overflow-hidden"
      style={{
        aspectRatio: '3/4',
        border: owned ? `1.5px solid ${color}55` : '1.5px solid #ffffff10',
        background: owned
          ? `linear-gradient(160deg, ${color}18 0%, #091524 60%)`
          : '#060F1A',
        boxShadow: owned && (isLegend || isEpic) ? `0 0 10px ${color}30` : undefined,
        filter: owned ? undefined : 'brightness(0.4) grayscale(0.6)',
      }}
    >
      {/* Image zone */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {card.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image_url}
            alt={card.name}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-lg font-black"
            style={{ color: owned ? color : '#333', fontFamily: 'Bebas Neue, sans-serif' }}
          >
            {getInitials(card.name)}
          </div>
        )}

        {/* Rarity badge top-left */}
        {owned && (isLegend || isEpic) && (
          <div
            className="absolute top-1 left-1 text-[8px] font-black px-1 py-0.5 rounded"
            style={{ background: `${color}33`, color, border: `1px solid ${color}55` }}
          >
            {card.rarity === 'Legend' ? 'LEG' : 'EPC'}
          </div>
        )}
      </div>

      {/* Name band */}
      <div
        className="px-1 py-1 text-center"
        style={{ background: owned ? `${color}22` : '#0a0a14' }}
      >
        <p
          className="text-[9px] font-black leading-tight truncate"
          style={{ color: owned ? '#fff' : '#333', fontFamily: 'Bebas Neue, sans-serif' }}
        >
          {card.name.split(' ').pop()}
        </p>
      </div>

      {/* Owned checkmark */}
      {owned && (
        <div
          className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black text-black"
          style={{ background: color }}
        >
          ✓
        </div>
      )}

      {/* Not owned slot indicator */}
      {!owned && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-white/10 text-sm">
            ?
          </div>
        </div>
      )}
    </motion.div>
  )
}

function NationSection({ group, ownedSet }: { group: NationGroup; ownedSet: Set<string> }) {
  const [expanded, setExpanded] = useState(false)
  const flag = getFlag(group.nation)
  const pct = group.cards.length > 0 ? (group.ownedCount / group.cards.length) * 100 : 0
  const complete = group.ownedCount === group.cards.length && group.cards.length > 0

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        complete ? 'border-[#F5C518]/30 bg-[#F5C518]/3' : 'border-white/5 bg-white/2'
      }`}
      style={complete ? { boxShadow: '0 0 16px rgba(245,197,24,0.08)' } : {}}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/3 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-2xl flex-shrink-0">{flag}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-black text-white text-sm truncate" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {group.nation.toUpperCase()}
            </h3>
            {complete && (
              <span className="text-[10px] font-black text-[#F5C518] bg-[#F5C518]/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                ✓ COMPLET
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: complete ? '#F5C518' : pct > 60 ? '#A855F7' : '#00D4FF' }}
              />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0 tabular-nums">
              {group.ownedCount}/{group.cards.length}
            </span>
          </div>
        </div>
        <div className="text-gray-600 flex-shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="border-t border-white/5 px-3 pb-4 pt-3">
              {/* Sticker grid by rarity */}
              {['Legend', 'Epic', 'Rare', 'Common'].map((rarity) => {
                const rarityCards = group.cards.filter((c) => c.rarity === rarity)
                if (rarityCards.length === 0) return null
                const color = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]
                const ownedCount = rarityCards.filter((c) => ownedSet.has(c.id)).length
                return (
                  <div key={rarity} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1" style={{ background: `${color}40` }} />
                      <p
                        className="text-[10px] font-black uppercase tracking-widest px-1 flex-shrink-0"
                        style={{ color }}
                      >
                        {rarity} · {ownedCount}/{rarityCards.length}
                      </p>
                      <div className="h-px flex-1" style={{ background: `${color}40` }} />
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-1.5">
                      {rarityCards.map((card) => (
                        <Sticker key={card.id} card={card} owned={ownedSet.has(card.id)} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PaniniClient({ nationGroups, ownedIds, totalCards }: Props) {
  const ownedSet = new Set(ownedIds)
  const [search, setSearch] = useState('')

  const ownedTotal = ownedIds.length
  const completedNations = nationGroups.filter((g) => g.ownedCount === g.cards.length && g.cards.length > 0).length
  const globalPct = totalCards > 0 ? Math.round((ownedTotal / totalCards) * 100) : 0

  const filtered = nationGroups.filter((g) =>
    search === '' || g.nation.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-black text-white mb-0.5" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            ALBUM PANINI
          </h1>
          <p className="text-gray-500 text-sm">
            <span className="text-[#F5C518] font-bold">{ownedTotal}</span>/{totalCards} stickers ·{' '}
            <span className="text-[#F5C518] font-bold">{completedNations}</span> équipes complètes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/collection"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5 transition-colors"
          >
            <Grid3x3 className="w-3.5 h-3.5" /> Grille
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#F5C518] text-black">
            <BookOpen className="w-3.5 h-3.5" /> Album
          </div>
        </div>
      </div>

      {/* Global progress */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Complétion globale</span>
          <span className="font-bold text-[#F5C518]">{globalPct}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${globalPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: globalPct === 100
                ? '#F5C518'
                : `linear-gradient(90deg, #00D4FF, #A855F7 ${globalPct}%)`,
            }}
          />
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Rechercher une équipe…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors"
      />

      {/* Nation sections */}
      <div className="space-y-2">
        {filtered.map((group) => (
          <NationSection key={group.nation} group={group} ownedSet={ownedSet} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-600 py-12">Aucune équipe trouvée</p>
        )}
      </div>
    </div>
  )
}
