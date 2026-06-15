'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Grid3x3, BookOpen } from 'lucide-react'
import { GameCard } from '@/components/ui/Card'
import type { Card } from '@/types'
import { RARITY_COLORS } from '@/types'
import Link from 'next/link'

interface Props {
  ownedCards: Card[]
  notOwnedCards: Card[]
  ownedIds: string[]
  totalCards: number
  currentPage: number
  totalPages: number
  notOwnedCount: number
  currentType: string
  currentRarity: string
}

export function CollectionClient({
  ownedCards, notOwnedCards, ownedIds,
  totalCards, currentPage, totalPages, notOwnedCount,
  currentType, currentRarity,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const ownedSet = new Set(ownedIds)

  const navigate = (updates: Record<string, string | number>) => {
    const params = new URLSearchParams()
    const type   = String(updates.type   ?? currentType)
    const rarity = String(updates.rarity ?? currentRarity)
    const p      = String(updates.page   ?? 1)

    if (type   !== 'all') params.set('type', type)
    if (rarity !== 'all') params.set('rarity', rarity)
    if (p !== '1')        params.set('page', p)

    startTransition(() => router.push(`/collection?${params.toString()}`))
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            MA COLLECTION
          </h1>
          <p className="text-gray-500 text-sm">
            <span className="text-[#F5C518] font-bold">{ownedIds.length}</span> / {totalCards} cartes collectées
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-28 hidden sm:block">
            <div className="text-right text-xs text-gray-500 mb-1">
              {totalCards > 0 ? Math.round((ownedIds.length / totalCards) * 100) : 0}%
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalCards > 0 ? (ownedIds.length / totalCards) * 100 : 0}%` }}
                className="h-full bg-[#F5C518] rounded-full"
              />
            </div>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#F5C518] text-black">
            <Grid3x3 className="w-3.5 h-3.5" /> Grille
          </div>
          <Link
            href="/collection?view=panini"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" /> Panini
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'player', 'nation', 'trophy'] as const).map((t) => (
            <button key={t} onClick={() => navigate({ type: t, page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                currentType === t
                  ? 'bg-[#F5C518] text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
              }`}>
              {t === 'all' ? 'Tous' : t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'Common', 'Rare', 'Epic', 'Legend'] as const).map((r) => (
            <button key={r} onClick={() => navigate({ rarity: r, page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentRarity === r ? 'text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
              }`}
              style={currentRarity === r && r !== 'all'
                ? { background: RARITY_COLORS[r] }
                : currentRarity === r ? { background: '#F5C518', color: '#000' } : {}}>
              {r === 'all' ? 'Toutes' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Owned */}
      {ownedCards.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
            Possédées ({ownedIds.length})
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
            {ownedCards.map((card) => (
              <GameCard key={card.id} card={card} owned size="sm" onClick={() => setSelectedCard(card)} />
            ))}
          </div>
        </div>
      )}

      {/* Not owned */}
      {(notOwnedCards.length > 0 || notOwnedCount > 0) && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
            Non possédées ({notOwnedCount})
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
            {notOwnedCards.map((card) => (
              <GameCard key={card.id} card={card} owned={false} size="sm" onClick={() => setSelectedCard(card)} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => navigate({ page: currentPage - 1 })}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Préc.
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
                const p = start + i
                return (
                  <button key={p} onClick={() => navigate({ page: p })}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                      p === currentPage
                        ? 'bg-[#F5C518] text-black'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                    }`}>
                    {p}
                  </button>
                )
              })}

              <button
                onClick={() => navigate({ page: currentPage + 1 })}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Suiv. <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-center text-white/20 text-xs mt-3">
            Page {currentPage} / {totalPages} · {notOwnedCount} cartes
          </p>
        </div>
      )}

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-sm glass-elevated rounded-t-3xl sm:rounded-2xl p-5 sm:p-6"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle (mobile) */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

              <div className="flex gap-4 items-start">
                <GameCard card={selectedCard} owned={ownedSet.has(selectedCard.id)} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: RARITY_COLORS[selectedCard.rarity] }}>
                    {selectedCard.rarity} · {selectedCard.type}
                  </div>
                  <h3 className="text-white font-black text-xl mb-2 truncate" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    {selectedCard.name}
                  </h3>
                  {selectedCard.description && (
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{selectedCard.description}</p>
                  )}
                  {selectedCard.stats && Object.keys(selectedCard.stats).length > 0 && (
                    <div className="space-y-1.5">
                      {Object.entries(selectedCard.stats)
                        .filter(([k]) => k !== 'position' && !isNaN(Number(selectedCard.stats[k])))
                        .slice(0, 6)
                        .map(([key, val]) => {
                          const num = Number(val)
                          const color = num >= 85 ? '#22c55e' : num >= 70 ? '#F5C518' : num >= 55 ? '#60a5fa' : '#9ca3af'
                          const LABELS: Record<string, string> = {
                            pace: 'PAC', shooting: 'TIR', passing: 'PAS', defending: 'DEF', dribbling: 'DRI', physical: 'PHY'
                          }
                          return (
                            <div key={key} className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-gray-500 uppercase font-semibold w-8 flex-shrink-0">
                                {LABELS[key] ?? key.slice(0,3).toUpperCase()}
                              </span>
                              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, num)}%` }}
                                  className="h-full rounded-full"
                                  style={{ background: color }}
                                />
                              </div>
                              <span className="text-xs font-black w-6 text-right" style={{ color }}>{num}</span>
                            </div>
                          )
                        })}
                    </div>
                  )}
                  {!ownedSet.has(selectedCard.id) && (
                    <div className="mt-3 p-2.5 rounded-xl bg-white/5 text-center">
                      <p className="text-gray-500 text-xs">Ouvre des packs pour obtenir cette carte</p>
                      <a href="/packs" className="text-[#F5C518] text-xs font-bold hover:underline mt-1 inline-block">
                        Ouvrir un pack →
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedCard(null)}
                className="w-full mt-4 py-3 border border-white/10 text-gray-500 active:bg-white/5 hover:text-white rounded-xl transition-colors text-sm font-semibold">
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
