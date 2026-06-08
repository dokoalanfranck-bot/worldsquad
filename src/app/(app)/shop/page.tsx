'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

const COIN_PACKS = [
  {
    key: 'starter',
    name: 'Pack Starter',
    price: '$2.99',
    coins: 1000,
    color: '#9CA3AF',
    icon: '🪙',
    highlight: false,
  },
  {
    key: 'fan',
    name: 'Pack Fan',
    price: '$6.99',
    coins: 3000,
    color: '#00D4FF',
    icon: '💎',
    highlight: true,
    badge: 'POPULAIRE',
  },
  {
    key: 'ultra',
    name: 'Pack Ultra',
    price: '$14.99',
    coins: 8000,
    color: '#F5C518',
    icon: '👑',
    highlight: false,
    badge: 'MEILLEUR PRIX',
  },
]

const VIP_PACK = {
  key: 'vip',
  name: 'VIP WorldSquad',
  price: '$9.99',
  perks: [
    'Bordure dorée animée sur ta carte',
    'Badge VIP visible sur ton profil',
    '3 Packs Rares offerts immédiatement',
    'Accès prioritaire aux cartes Événements',
  ],
}

export default function ShopPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const success = searchParams.get('success')
  const cancel = searchParams.get('cancel')

  async function handleBuy(packType: string) {
    setLoading(packType)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packType }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error ?? 'Erreur')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur de paiement')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          BOUTIQUE
        </h1>
        <p className="text-gray-500 text-sm">Achète des SquadCoins ou passe VIP</p>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold"
        >
          ✅ Paiement confirmé ! Tes coins ont été crédités.
        </motion.div>
      )}
      {cancel && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold">
          ❌ Paiement annulé.
        </div>
      )}

      {/* Coin packs */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          SQUADCOINS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COIN_PACKS.map((pack) => (
            <motion.div
              key={pack.key}
              whileHover={{ scale: 1.02, y: -4 }}
              className={`relative glass rounded-2xl p-6 border transition-all ${
                pack.highlight
                  ? 'border-[#00D4FF]/40'
                  : 'border-white/5'
              }`}
              style={pack.highlight ? { boxShadow: '0 0 30px rgba(0,212,255,0.1)' } : {}}
            >
              {pack.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-black px-3 py-1 rounded-full text-black"
                  style={{ background: pack.color }}
                >
                  {pack.badge}
                </div>
              )}
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">{pack.icon}</div>
                <h3 className="text-white font-black text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  {pack.name}
                </h3>
                <div className="text-3xl font-black mt-1" style={{ color: pack.color, fontFamily: 'Bebas Neue, sans-serif' }}>
                  {pack.coins.toLocaleString()} 🪙
                </div>
                <div className="text-gray-400 text-sm mt-1">= {pack.price}</div>
              </div>
              <button
                onClick={() => handleBuy(pack.key)}
                disabled={loading === pack.key}
                className="w-full font-black py-3 rounded-xl transition-all hover:opacity-90 disabled:opacity-50 text-black"
                style={{ background: pack.color, fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {loading === pack.key ? 'CHARGEMENT...' : `ACHETER — ${pack.price}`}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VIP */}
      <section>
        <h2 className="text-xl font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          PASSE VIP
        </h2>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass rounded-2xl p-6 border border-[#F5C518]/30"
          style={{ boxShadow: '0 0 40px rgba(245,197,24,0.08)' }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">👑</span>
                <h3 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  {VIP_PACK.name}
                </h3>
                <span className="text-[#F5C518] text-2xl font-black" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  {VIP_PACK.price}
                </span>
              </div>
              <ul className="space-y-1">
                {VIP_PACK.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-[#F5C518]">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => handleBuy('vip')}
              disabled={loading === 'vip'}
              className="flex-shrink-0 bg-[#F5C518] hover:bg-[#ffd700] disabled:opacity-50 text-black font-black px-8 py-4 rounded-xl transition-all hover:scale-105 vip-border"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem' }}
            >
              {loading === 'vip' ? 'CHARGEMENT...' : '👑 PASSER VIP'}
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
