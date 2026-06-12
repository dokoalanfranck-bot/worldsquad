'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { ShoppingBag, Crown, CheckCircle2, XCircle, Zap, Star, CircleDollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

const COIN_PACKS: { key: string; name: string; price: string; coins: number; color: string; highlight: boolean; badge?: string }[] = [
  { key: 'starter', name: 'Pack Starter', price: '$2.99', coins: 1000, color: '#9CA3AF', highlight: false },
  { key: 'fan', name: 'Pack Fan', price: '$6.99', coins: 3000, color: '#00D4FF', highlight: true, badge: 'POPULAIRE' },
  { key: 'ultra', name: 'Pack Ultra', price: '$14.99', coins: 8000, color: '#F5C518', highlight: false, badge: 'MEILLEUR PRIX' },
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

const PACK_ICONS = [Star, Zap, Crown] as const

export default function ShopPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const cancel = searchParams.get('cancel')

  async function handleBuy(packType: string) {
    setLoading(packType)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packType }) })
      const data = await res.json()
      if (data.url) { window.location.href = data.url } else { throw new Error(data.error ?? 'Erreur') }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur de paiement')
    } finally { setLoading(null) }
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto pb-28">
      {/* Header */}
      <div className="mb-6">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">WorldSquad</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <ShoppingBag size={22} className="text-blue-400" />
          </div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>BOUTIQUE</h1>
        </div>
        <p className="text-white/30 text-sm mt-2">Achète des SquadCoins ou passe VIP</p>
      </div>

      {/* Alerts */}
      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold flex items-center gap-2">
          <CheckCircle2 size={16} /> Paiement confirmé ! Tes coins ont été crédités.
        </motion.div>
      )}
      {cancel && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center gap-2">
          <XCircle size={16} /> Paiement annulé.
        </div>
      )}

      {/* Coin packs */}
      <section className="mb-10">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4">SquadCoins</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COIN_PACKS.map((pack, idx) => {
            const Icon = PACK_ICONS[idx]
            return (
              <motion.div key={pack.key} whileTap={{ scale: 0.98 }}
                className={`relative glass rounded-2xl p-6 border transition-all ${pack.highlight ? 'border-[#00D4FF]/35' : 'border-white/5'}`}
                style={pack.highlight ? { boxShadow: '0 0 30px rgba(0,212,255,0.08)' } : {}}>
                {pack.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-1 rounded-full text-black" style={{ background: pack.color }}>
                    {pack.badge}
                  </div>
                )}
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${pack.color}18` }}>
                    <Icon size={28} style={{ color: pack.color }} />
                  </div>
                  <h3 className="text-white font-black text-base" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{pack.name}</h3>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className="text-3xl font-black tabular-nums" style={{ color: pack.color, fontFamily: 'Bebas Neue, sans-serif' }}>
                      {pack.coins.toLocaleString()}
                    </span>
                    <CircleDollarSign size={16} style={{ color: pack.color }} />
                  </div>
                  <div className="text-white/30 text-sm mt-0.5">{pack.price}</div>
                </div>
                <button onClick={() => handleBuy(pack.key)} disabled={loading === pack.key}
                  className="w-full font-black py-3 rounded-xl transition-all hover:opacity-90 disabled:opacity-50 text-black text-sm"
                  style={{ background: pack.color, fontFamily: 'Bebas Neue, sans-serif' }}>
                  {loading === pack.key ? 'CHARGEMENT…' : `ACHETER — ${pack.price}`}
                </button>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* VIP */}
      <section>
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4">Passe VIP</p>
        <motion.div whileTap={{ scale: 0.99 }}
          className="glass rounded-2xl p-6 border border-[#F5C518]/25"
          style={{ boxShadow: '0 0 40px rgba(245,197,24,0.06)' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center">
                  <Crown size={20} className="text-[#F5C518]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white leading-none" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{VIP_PACK.name}</h3>
                  <span className="text-[#F5C518] font-black text-base" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{VIP_PACK.price}</span>
                </div>
              </div>
              <ul className="space-y-2">
                {VIP_PACK.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm text-white/50">
                    <CheckCircle2 size={13} className="text-[#F5C518] flex-shrink-0" />{perk}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => handleBuy('vip')} disabled={loading === 'vip'}
              className="flex-shrink-0 flex items-center gap-2 bg-[#F5C518] hover:bg-[#ffd700] disabled:opacity-50 text-black font-black px-8 py-4 rounded-xl transition-all"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem' }}>
              <Crown size={18} />
              {loading === 'vip' ? 'CHARGEMENT…' : 'PASSER VIP'}
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
