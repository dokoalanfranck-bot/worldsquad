'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GameCard } from '@/components/ui/Card'
import { Swords, Shield } from 'lucide-react'
import type { Card } from '@/types'
import toast from 'react-hot-toast'

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾', Italy: '🇮🇹',
  USA: '🇺🇸', Mexico: '🇲🇽', Canada: '🇨🇦', Morocco: '🇲🇦',
}

interface Challenger {
  id: string
  pseudo: string
  nation: string
  photo_url: string | null
}

interface Battle {
  id: string
  challenger_id: string
  coins_stake: number
  challenger: Challenger | null
  challenger_card: Card | null
}

interface Props {
  battle: Battle
  myCards: Card[]
}

export function AcceptBattleClient({ battle, myCards }: Props) {
  const router = useRouter()
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(false)

  const challenger = battle.challenger
  const challengerFlag = challenger ? (NATION_FLAGS[challenger.nation] ?? '🌍') : ''

  async function handleAccept() {
    if (!selectedCard) return
    setLoading(true)
    try {
      const res = await fetch(`/api/battles/${battle.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: selectedCard.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur')
      }
      toast.success('Battle résolu ! Découvre le résultat !')
      router.push(`/battles/${battle.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
      setLoading(false)
    }
  }

  async function handleDecline() {
    setLoading(true)
    try {
      await fetch(`/api/battles/${battle.id}/decline`, { method: 'POST' })
      toast.success('Défi refusé')
      router.push('/battles')
    } catch {
      toast.error('Erreur')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-sm font-bold">DÉFI EN ATTENTE</span>
        </div>
        <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {challengerFlag} {challenger?.pseudo} te défie !
        </h1>
        <p className="text-gray-400 mt-2">
          Mise : <span className="text-[#F5C518] font-black">{battle.coins_stake} coins</span>
        </p>
      </motion.div>

      {/* Challenger's card (revealed) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6 mb-6"
      >
        <p className="text-gray-500 text-sm font-semibold mb-4 flex items-center gap-2">
          <Shield size={14} />
          Sa carte (révélée après le battle)
        </p>
        <div className="flex justify-center">
          {battle.challenger_card ? (
            <div className="relative">
              <GameCard card={battle.challenger_card} owned size="lg" />
              <div className="absolute inset-0 backdrop-blur-md rounded-xl bg-black/60 flex items-center justify-center">
                <div className="text-4xl">⚔️</div>
              </div>
            </div>
          ) : (
            <div className="w-[210px] h-[295px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl">
              ⚔️
            </div>
          )}
        </div>
      </motion.div>

      {/* My card picker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-lg font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          CHOISIS TA CARTE
        </h2>

        {myCards.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-gray-500">Tu n&apos;as pas de cartes. Ouvre des packs d&apos;abord !</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
            {myCards.map((card) => (
              <motion.div
                key={card.id}
                whileTap={{ scale: 0.95 }}
                className={`rounded-xl transition-all ${
                  selectedCard?.id === card.id ? 'ring-2 ring-[#F5C518]' : ''
                }`}
              >
                <GameCard
                  card={card}
                  owned
                  size="sm"
                  selected={selectedCard?.id === card.id}
                  onClick={() => setSelectedCard(card)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Selected card preview */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass rounded-2xl p-4 mb-6 flex items-center gap-4"
          >
            <GameCard card={selectedCard} owned size="sm" />
            <div className="flex-1">
              <p className="text-white font-bold">{selectedCard.name}</p>
              <p className="text-gray-500 text-sm capitalize">{selectedCard.rarity}</p>
            </div>
            <div className="text-[#F5C518] font-black text-sm">Sélectionnée ✓</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleAccept}
          disabled={!selectedCard || loading}
          className="w-full bg-[#F5C518] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-4 rounded-xl hover:bg-[#ffd700] transition-all text-lg flex items-center justify-center gap-2"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          {loading ? (
            <span className="animate-pulse">RÉSOLUTION EN COURS...</span>
          ) : (
            <>
              <Swords size={20} />
              ACCEPTER ET COMBATTRE — {battle.coins_stake} COINS
            </>
          )}
        </motion.button>

        <button
          onClick={handleDecline}
          disabled={loading}
          className="w-full py-3 border border-white/10 text-gray-500 hover:text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Refuser le défi
        </button>
      </div>
    </div>
  )
}
