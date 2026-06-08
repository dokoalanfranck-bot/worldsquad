'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Grid3x3, BookOpen } from 'lucide-react'
import { GameCard } from '@/components/ui/Card'
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

function NationSection({ group, ownedSet }: { group: NationGroup; ownedSet: Set<string> }) {
  const [expanded, setExpanded] = useState(false)
  const flag = getFlag(group.nation)
  const pct = group.cards.length > 0 ? (group.ownedCount / group.cards.length) * 100 : 0
  const complete = group.ownedCount === group.cards.length && group.cards.length > 0

  return (
    <div
      className={`glass rounded-2xl border overflow-hidden transition-all ${
        complete ? 'border-[#F5C518]/30' : 'border-white/5'
      }`}
      style={complete ? { boxShadow: '0 0 20px rgba(245,197,24,0.1)' } : {}}
    >
      {/* Header */}
      <button
        className="w-full flex items-center gap-4 p-4 hover:bg-white/3 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-3xl">{flag}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-white text-sm truncate" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {group.nation.toUpperCase()}
            </h3>
            {complete && (
              <span className="text-xs font-bold text-[#F5C518] bg-[#F5C518]/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                ✓ COMPLET
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: complete ? '#F5C518' : pct > 50 ? '#A855F7' : '#00D4FF' }}
              />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0 font-semibold">
              {group.ownedCount}/{group.cards.length}
            </span>
          </div>
        </div>
        <div className="text-gray-600">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Cards grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-4 pb-4 border-t border-white/5">
              {/* Legend/Epic first */}
              {['Legend', 'Epic', 'Rare', 'Common'].map((rarity) => {
                const rarityCards = group.cards.filter((c) => c.rarity === rarity)
                if (rarityCards.length === 0) return null
                return (
                  <div key={rarity} className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] }}>
                      {rarity} ({rarityCards.filter((c) => ownedSet.has(c.id)).length}/{rarityCards.length})
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                      {rarityCards.map((card) => (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className="relative"
                        >
                          <GameCard
                            card={card}
                            owned={ownedSet.has(card.id)}
                            size="sm"
                          />
                          {ownedSet.has(card.id) && (
                            <div
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-black z-10"
                              style={{ background: RARITY_COLORS[card.rarity] }}
                            >
                              ✓
                            </div>
                          )}
                        </motion.div>
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

  const filtered = nationGroups.filter((g) =>
    search === '' || g.nation.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            MA COLLECTION
          </h1>
          <p className="text-gray-500 text-sm">
            <span className="text-[#F5C518] font-bold">{ownedTotal}</span> / {totalCards} cartes ·
            <span className="text-[#F5C518] font-bold ml-1">{completedNations}</span> équipes complètes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <Link
            href="/collection"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5 transition-colors"
          >
            <Grid3x3 className="w-3.5 h-3.5" /> Grille
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#F5C518] text-black">
            <BookOpen className="w-3.5 h-3.5" /> Panini
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Progression globale</span>
          <span>{totalCards > 0 ? Math.round((ownedTotal / totalCards) * 100) : 0}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalCards > 0 ? (ownedTotal / totalCards) * 100 : 0}%` }}
            className="h-full bg-[#F5C518] rounded-full"
          />
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Rechercher une équipe…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors"
      />

      {/* Nation sections */}
      <div className="space-y-3">
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
