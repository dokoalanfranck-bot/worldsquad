'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Repeat2, Coins, TrendingUp, Package, Check, Loader2 } from 'lucide-react'
import { GameCard } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import type { Card } from '@/types'

interface DupEntry {
  card: Card
  copies: number
  extras: number
  sellPrice: number
}

interface Props {
  duplicates: DupEntry[]
  totalCoins: number
  sellPrices: Record<string, number>
}

const RARITY_COLORS: Record<string, string> = {
  Legend: '#F5C518', Epic: '#A855F7', Rare: '#00D4FF', Common: '#9CA3AF',
}
const RARITY_ORDER: Record<string, number> = { Legend: 4, Epic: 3, Rare: 2, Common: 1 }

export function DoublonsClient({ duplicates: initial, totalCoins: initialCoins, sellPrices }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selling, setSelling] = useState<Record<string, boolean>>({})
  const [soldAll, setSoldAll] = useState(false)
  const [localDups, setLocalDups] = useState(initial)
  const [totalCoins, setTotalCoins] = useState(initialCoins)

  async function sellCard(cardId: string, quantity: number) {
    setSelling((s) => ({ ...s, [cardId]: true }))
    try {
      const res = await fetch('/api/cards/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, quantity }),
      })
      const data = await res.json() as { success?: boolean; coinsEarned?: number; sold?: number; newBalance?: number; error?: string }
      if (!res.ok || !data.success) {
        toast.error(data.error ?? 'Erreur lors de la vente')
        return
      }
      toast.success(`+${data.coinsEarned}🪙 gagnés !`)
      // Update local state optimistically
      setLocalDups((prev) => {
        const updated = prev.map((d) => {
          if (d.card.id !== cardId) return d
          const newExtras = d.extras - (data.sold ?? quantity)
          const newCopies = d.copies - (data.sold ?? quantity)
          return { ...d, copies: newCopies, extras: newExtras, sellPrice: (sellPrices[d.card.rarity] ?? 10) * newExtras }
        }).filter((d) => d.extras > 0)
        setTotalCoins(updated.reduce((s, d) => s + d.sellPrice, 0))
        return updated
      })
      startTransition(() => router.refresh())
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSelling((s) => ({ ...s, [cardId]: false }))
    }
  }

  async function sellAll() {
    if (localDups.length === 0) return
    setSoldAll(true)
    try {
      await Promise.all(localDups.map((d) => sellCard(d.card.id, d.extras)))
    } finally {
      setSoldAll(false)
    }
  }

  const countByRarity = localDups.reduce<Record<string, number>>((acc, d) => {
    acc[d.card.rarity] = (acc[d.card.rarity] ?? 0) + d.extras
    return acc
  }, {})

  return (
    <div className="min-h-screen px-4 lg:px-8 py-6 max-w-2xl lg:max-w-5xl mx-auto pb-32">

      {/* Header */}
      <div className="mb-8">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">WorldSquad</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/15 flex items-center justify-center">
            <Repeat2 size={22} className="text-pink-400" />
          </div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            DOUBLONS
          </h1>
        </div>
        <p className="text-white/30 text-sm mt-2 ml-0.5">Vends tes cartes en double pour récupérer des pièces</p>
      </div>

      {localDups.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center mx-auto mb-5">
            <Check size={36} className="text-green-400" />
          </div>
          <p className="text-white font-black text-xl mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>COLLECTION PARFAITE !</p>
          <p className="text-white/40 text-sm">Tu n'as aucun doublon pour l'instant.</p>
          <p className="text-white/25 text-sm mt-1">Continue d'ouvrir des packs pour compléter ta collection.</p>
        </motion.div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="glass rounded-2xl p-5 mb-6 border border-white/5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-white font-black text-3xl leading-none">{localDups.reduce((s, d) => s + d.extras, 0)}</p>
                  <p className="text-white/40 text-xs mt-0.5">doublons</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <p className="text-yellow-400 font-black text-3xl leading-none">{totalCoins.toLocaleString()}</p>
                  <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1"><Coins size={10} />pièces disponibles</p>
                </div>
                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                <div className="hidden sm:flex gap-2 flex-wrap">
                  {Object.entries(countByRarity).sort((a, b) => (RARITY_ORDER[b[0]] ?? 0) - (RARITY_ORDER[a[0]] ?? 0)).map(([rarity, count]) => (
                    <span key={rarity} className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: RARITY_COLORS[rarity], background: `${RARITY_COLORS[rarity]}15` }}>
                      {count} {rarity}
                    </span>
                  ))}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={sellAll}
                disabled={soldAll || isPending}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F5C518] text-black font-black text-sm disabled:opacity-60"
                style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '16px' }}
              >
                {soldAll ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                TOUT VENDRE — {totalCoins.toLocaleString()}🪙
              </motion.button>
            </div>
          </div>

          {/* Price legend */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {(['Legend', 'Epic', 'Rare', 'Common'] as const).map((r) => (
              <div key={r} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                <span className="w-2 h-2 rounded-full" style={{ background: RARITY_COLORS[r] }} />
                <span className="text-white/50 text-xs">{r}</span>
                <span className="text-white font-bold text-xs">{sellPrices[r]}🪙</span>
              </div>
            ))}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {localDups.map((d) => (
                <motion.div
                  key={d.card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex flex-col gap-2"
                >
                  {/* Card visual with copy badge */}
                  <div className="relative">
                    <GameCard card={d.card} owned size="sm" />
                    {/* Copies badge */}
                    <div
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-[#07070f]"
                      style={{ background: RARITY_COLORS[d.card.rarity], color: d.card.rarity === 'Common' ? '#fff' : '#000' }}
                    >
                      ×{d.copies}
                    </div>
                    {/* Extras indicator */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#07070f] border"
                      style={{ borderColor: `${RARITY_COLORS[d.card.rarity]}40`, color: RARITY_COLORS[d.card.rarity] }}>
                      +{d.extras} en trop
                    </div>
                  </div>

                  {/* Card name */}
                  <div className="pt-2">
                    <p className="text-white text-xs font-semibold text-center truncate">{d.card.name}</p>
                    <p className="text-center text-[10px] font-bold mt-0.5" style={{ color: RARITY_COLORS[d.card.rarity] }}>
                      {sellPrices[d.card.rarity]}🪙 / doublon
                    </p>
                  </div>

                  {/* Sell buttons */}
                  <div className="flex gap-1.5">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => sellCard(d.card.id, 1)}
                      disabled={selling[d.card.id]}
                      className="flex-1 py-1.5 rounded-lg text-xs font-black disabled:opacity-50 transition-all"
                      style={{ background: `${RARITY_COLORS[d.card.rarity]}20`, color: RARITY_COLORS[d.card.rarity], border: `1px solid ${RARITY_COLORS[d.card.rarity]}30` }}
                    >
                      {selling[d.card.id] ? <Loader2 size={12} className="animate-spin mx-auto" /> : `×1`}
                    </motion.button>
                    {d.extras > 1 && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => sellCard(d.card.id, d.extras)}
                        disabled={selling[d.card.id]}
                        className="flex-1 py-1.5 rounded-lg text-xs font-black text-black disabled:opacity-50 transition-all"
                        style={{ background: RARITY_COLORS[d.card.rarity] }}
                      >
                        {selling[d.card.id] ? <Loader2 size={12} className="animate-spin mx-auto" /> : `Tout (${d.sellPrice}🪙)`}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Footer info */}
          <div className="mt-8 glass rounded-xl p-4 flex items-start gap-3">
            <Package size={16} className="text-white/30 mt-0.5 flex-shrink-0" />
            <p className="text-white/30 text-xs leading-relaxed">
              La dernière copie d'une carte n'est jamais vendue automatiquement. Tu conserveras toujours au moins 1 exemplaire de chaque carte dans ta collection.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
