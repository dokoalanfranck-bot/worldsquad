'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const THRESHOLD = 120
const LS_KEY = 'low_coins_prompted'

export function LowCoinsModal({ userId, initialCoins }: { userId: string; initialCoins: number }) {
  const router = useRouter()
  const supabase = createClient()
  const [coins, setCoins] = useState(initialCoins)
  const [visible, setVisible] = useState(false)
  const coinsRef = useRef(coins)
  useEffect(() => { coinsRef.current = coins }, [coins])

  // Show modal if already below threshold on mount (and not yet prompted)
  useEffect(() => {
    if (initialCoins < THRESHOLD && !localStorage.getItem(LS_KEY)) {
      setVisible(true)
      localStorage.setItem(LS_KEY, '1')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription on user's coins
  useEffect(() => {
    const ch = supabase
      .channel(`low-coins-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        ({ new: updated }) => {
          const newCoins = (updated as { coins: number }).coins ?? 0
          const prev = coinsRef.current
          setCoins(newCoins)

          // Reset flag when back above threshold (allow future trigger)
          if (newCoins >= THRESHOLD) {
            localStorage.removeItem(LS_KEY)
          }

          // Show once when crossing below threshold
          if (newCoins < THRESHOLD && prev >= THRESHOLD && !localStorage.getItem(LS_KEY)) {
            setVisible(true)
            localStorage.setItem(LS_KEY, '1')
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() { setVisible(false) }

  function goShop() {
    setVisible(false)
    router.push('/shop')
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="low-coins-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => e.target === e.currentTarget && dismiss()}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="w-full max-w-sm bg-[#13131f] border border-white/10 rounded-3xl p-6 shadow-2xl"
          >
            {/* Dismiss */}
            <div className="flex justify-end mb-1">
              <button onClick={dismiss}
                className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
                <X size={13} />
              </button>
            </div>

            {/* Coin icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center"
                  style={{ boxShadow: '0 0 32px rgba(245,197,24,0.2)' }}>
                  <Coins size={32} className="text-[#F5C518]" />
                </div>
                <span className="absolute -top-1 -right-1 text-lg">😬</span>
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5 mb-5">
              <p className="text-white font-black text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                TU MANQUES DE COINS !
              </p>
              <p className="text-white/50 text-sm leading-relaxed">
                Il te reste seulement <span className="text-[#F5C518] font-bold">{coins} coins</span>.
                Recharge pour continuer à ouvrir des packs et jouer des battles.
              </p>
            </div>

            {/* CTA */}
            <button onClick={goShop}
              className="w-full py-3.5 rounded-2xl bg-[#F5C518] text-black font-black flex items-center justify-center gap-2 hover:bg-[#f0bc00] transition-colors"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              <ShoppingBag size={16} /> RECHARGER MES COINS
            </button>

            <button onClick={dismiss}
              className="w-full mt-2.5 py-2.5 text-white/30 text-sm font-medium hover:text-white/50 transition-colors">
              Plus tard
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
