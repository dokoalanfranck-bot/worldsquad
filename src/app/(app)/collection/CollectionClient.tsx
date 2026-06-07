'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameCard } from '@/components/ui/Card'
import type { Card, CardRarity, CardType } from '@/types'
import { RARITY_COLORS } from '@/types'

interface Props {
  allCards: Card[]
  ownedIds: string[]
}

export function CollectionClient({ allCards, ownedIds }: Props) {
  const [filterType, setFilterType] = useState<CardType | 'all'>('all')
  const [filterRarity, setFilterRarity] = useState<CardRarity | 'all'>('all')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  const ownedSet = new Set(ownedIds)

  const filtered = allCards.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false
    if (filterRarity !== 'all' && c.rarity !== filterRarity) return false
    return true
  })

  const owned = filtered.filter((c) => ownedSet.has(c.id))
  const notOwned = filtered.filter((c) => !ownedSet.has(c.id))

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            MA COLLECTION
          </h1>
          <p className="text-gray-500 text-sm">
            <span className="text-[#F5C518] font-bold">{ownedIds.length}</span> / {allCards.length} cartes collectées
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-40 hidden sm:block">
          <div className="text-right text-xs text-gray-500 mb-1">
            {Math.round((ownedIds.length / allCards.length) * 100)}%
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(ownedIds.length / allCards.length) * 100}%` }}
              className="h-full bg-[#F5C518] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-1.5">
          {(['all', 'player', 'nation', 'trophy'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                filterType === t
                  ? 'bg-[#F5C518] text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              {t === 'all' ? 'Tous' : t}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'Common', 'Rare', 'Epic', 'Legend'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRarity(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterRarity === r
                  ? 'text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
              }`}
              style={filterRarity === r && r !== 'all' ? { background: RARITY_COLORS[r] } : filterRarity === r ? { background: '#F5C518', color: '#000' } : {}}
            >
              {r === 'all' ? 'Toutes' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Owned cards */}
      {owned.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
            Possédées ({owned.length})
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {owned.map((card) => (
              <GameCard
                key={card.id}
                card={card}
                owned
                size="sm"
                onClick={() => setSelectedCard(card)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Not owned */}
      {notOwned.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
            Non possédées ({notOwned.length})
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {notOwned.map((card) => (
              <GameCard
                key={card.id}
                card={card}
                owned={false}
                size="sm"
                onClick={() => setSelectedCard(card)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Card detail modal */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="glass-elevated rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-4 items-start">
                <GameCard card={selectedCard} owned={ownedSet.has(selectedCard.id)} size="md" />
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: RARITY_COLORS[selectedCard.rarity] }}>
                    {selectedCard.rarity} · {selectedCard.type}
                  </div>
                  <h3 className="text-white font-black text-xl mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    {selectedCard.name}
                  </h3>
                  {selectedCard.description && (
                    <p className="text-gray-500 text-xs mb-3">{selectedCard.description}</p>
                  )}
                  {selectedCard.stats && Object.keys(selectedCard.stats).length > 0 && (
                    <div className="space-y-1.5">
                      {Object.entries(selectedCard.stats).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 uppercase">{key}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, Number(val))}%` }}
                                className="h-full rounded-full"
                                style={{ background: RARITY_COLORS[selectedCard.rarity] }}
                              />
                            </div>
                            <span className="text-xs font-bold text-white w-6 text-right">{String(val)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!ownedSet.has(selectedCard.id) && (
                    <div className="mt-4 p-3 rounded-xl bg-white/5 text-center">
                      <p className="text-gray-500 text-xs">Ouvre des packs pour obtenir cette carte</p>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="w-full mt-4 py-2 border border-white/10 text-gray-500 hover:text-white rounded-xl transition-colors text-sm font-semibold"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
