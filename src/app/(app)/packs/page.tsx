'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { PACK_CONFIGS, RARITY_COLORS, RARITY_GLOW } from '@/types'
import type { Card, CardRarity } from '@/types'
import { GameCard } from '@/components/ui/Card'
import toast from 'react-hot-toast'

type PackKey = keyof typeof PACK_CONFIGS

interface OpenState {
  phase: 'idle' | 'shaking' | 'exploding' | 'revealing' | 'done'
  cards: Card[]
  currentReveal: number
}

export default function PacksPage() {
  const supabase = createClient()
  const [userCoins, setUserCoins] = useState<number | null>(null)
  const [state, setState] = useState<OpenState>({ phase: 'idle', cards: [], currentReveal: 0 })
  const [selectedPack, setSelectedPack] = useState<PackKey | null>(null)

  async function loadCoins() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('users').select('coins').eq('id', user.id).single()
    if (data) setUserCoins(data.coins)
  }

  async function openPack(packType: PackKey) {
    const config = PACK_CONFIGS[packType]
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('users').select('coins').eq('id', user.id).single()
    if (!profile || profile.coins < config.cost) {
      toast.error(`Coins insuffisants ! Il te faut ${config.cost} coins.`)
      return
    }

    setSelectedPack(packType)

    // Debit coins
    await supabase.from('users').update({ coins: profile.coins - config.cost }).eq('id', user.id)
    await supabase.from('coin_transactions').insert({
      user_id: user.id,
      amount: -config.cost,
      reason: `Ouverture ${config.name}`,
    })

    // Start animation
    setState({ phase: 'shaking', cards: [], currentReveal: 0 })

    setTimeout(() => {
      setState((s) => ({ ...s, phase: 'exploding' }))
      setTimeout(async () => {
        // Fetch cards from API
        const res = await fetch('/api/packs/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packType }),
        })
        const { cards } = await res.json()
        setState({ phase: 'revealing', cards: cards ?? [], currentReveal: 0 })

        // Reveal one by one
        for (let i = 1; i <= (cards?.length ?? 0); i++) {
          await new Promise((r) => setTimeout(r, 800))
          setState((s) => ({ ...s, currentReveal: i }))
        }
        setState((s) => ({ ...s, phase: 'done' }))
        setUserCoins((prev) => (prev !== null ? prev - config.cost : null))
      }, 600)
    }, 1200)
  }

  const packColors: Record<PackKey, string> = {
    common: '#9CA3AF',
    rare: '#00D4FF',
    elite: '#F5C518',
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            OUVRIR DES PACKS
          </h1>
          <p className="text-gray-500 text-sm">Collecte des cartes joueurs, nations et trophées</p>
        </div>
        {userCoins !== null && (
          <div className="text-[#F5C518] font-black text-xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            🪙 {userCoins.toLocaleString()}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {state.phase === 'idle' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {(Object.entries(PACK_CONFIGS) as [PackKey, typeof PACK_CONFIGS[PackKey]][]).map(([key, config]) => (
                <motion.div
                  key={key}
                  whileHover={{ scale: 1.04, y: -6 }}
                  whileTap={{ scale: 0.97 }}
                  className="glass rounded-2xl p-6 border border-white/5 cursor-pointer text-center"
                  style={{ boxShadow: `0 0 30px ${packColors[key]}15` }}
                  onClick={() => openPack(key)}
                >
                  {/* Pack visual */}
                  <div
                    className="w-24 h-32 mx-auto mb-4 rounded-xl flex items-center justify-center relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${packColors[key]}20, ${packColors[key]}40)`,
                      border: `2px solid ${packColors[key]}60`,
                      boxShadow: `0 0 20px ${packColors[key]}30`,
                    }}
                  >
                    <span className="text-4xl">🃏</span>
                    <div
                      className="absolute inset-0 holo-effect opacity-20"
                      style={{ background: key !== 'common' ? undefined : 'none' }}
                    />
                  </div>

                  <h3
                    className="text-xl font-black text-white mb-2"
                    style={{ fontFamily: 'Bebas Neue, sans-serif', color: packColors[key] }}
                  >
                    {config.name}
                  </h3>

                  {/* Odds */}
                  <div className="space-y-1 mb-4">
                    {Object.entries(config.odds)
                      .filter(([, v]) => v > 0)
                      .map(([rarity, pct]) => (
                        <div key={rarity} className="flex items-center justify-between text-xs">
                          <span style={{ color: RARITY_COLORS[rarity as CardRarity] }}>{rarity}</span>
                          <span className="text-gray-500">{Math.round(pct * 100)}%</span>
                        </div>
                      ))}
                  </div>

                  <button
                    className="w-full font-black py-3 rounded-xl text-black transition-all"
                    style={{ background: packColors[key], fontFamily: 'Bebas Neue, sans-serif' }}
                    onClick={() => { loadCoins(); openPack(key) }}
                  >
                    {config.cost} 🪙
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Shaking animation */}
        {state.phase === 'shaking' && (
          <motion.div
            key="shaking"
            className="flex items-center justify-center min-h-[400px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              animate={{ rotate: [-5, 5, -5, 5, 0], scale: [1, 1.05, 1, 1.05, 1.1] }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="w-32 h-48 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${packColors[selectedPack ?? 'common']}20, ${packColors[selectedPack ?? 'common']}40)`,
                border: `3px solid ${packColors[selectedPack ?? 'common']}`,
                boxShadow: `0 0 60px ${packColors[selectedPack ?? 'common']}50`,
              }}
            >
              <span className="text-6xl">🃏</span>
            </motion.div>
          </motion.div>
        )}

        {/* Reveal phase */}
        {(state.phase === 'revealing' || state.phase === 'done') && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2
              className="text-center text-2xl font-black text-white mb-8"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {state.phase === 'done' ? '🎉 TES CARTES !' : 'RÉVÉLATION...'}
            </h2>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {state.cards.map((card, i) => (
                <AnimatePresence key={card.id}>
                  {i < state.currentReveal && (
                    <motion.div
                      initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
                      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{ boxShadow: RARITY_GLOW[card.rarity] }}
                      className="rounded-xl"
                    >
                      <GameCard card={card} size="lg" owned />
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>
            {state.phase === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center gap-4 mt-10"
              >
                <button
                  onClick={() => setState({ phase: 'idle', cards: [], currentReveal: 0 })}
                  className="bg-[#F5C518] hover:bg-[#ffd700] text-black font-black px-8 py-3 rounded-xl transition-all hover:scale-105"
                  style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                >
                  OUVRIR UN AUTRE PACK
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
