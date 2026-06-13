'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, Clock, ChevronRight } from 'lucide-react'
import type { FlashChallenge } from '@/lib/flash-challenges'

function useCountdown(endTime: string) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0, expired: false })

  useEffect(() => {
    function tick() {
      const diff = new Date(endTime).getTime() - Date.now()
      if (diff <= 0) { setTime({ h: 0, m: 0, s: 0, expired: true }); return }
      setTime({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
        expired: false,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endTime])

  return time
}

export function FlashChallengeBanner({ challenge }: { challenge: FlashChallenge }) {
  const { h, m, s, expired } = useCountdown(challenge.ends_at)
  if (expired) return null

  const teamA = challenge.match?.team_a ?? '?'
  const teamB = challenge.match?.team_b ?? '?'
  const flagA = challenge.match?.flag_a ?? '🏳'
  const flagB = challenge.match?.flag_b ?? '🏳'

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mb-5 rounded-2xl overflow-hidden border border-[#F5C518]/30"
      style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.07) 0%, rgba(200,16,46,0.05) 100%)' }}
    >
      {/* Animated stripe */}
      <motion.div
        className="h-1"
        style={{ background: 'linear-gradient(90deg, #C8102E, #F5C518, #C8102E)', backgroundSize: '200% 100%' }}
        animate={{ backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">

          {/* Pulsing lightning icon */}
          <motion.div
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,197,24,0.18)', boxShadow: '0 0 20px rgba(245,197,24,0.25)' }}
          >
            <Zap size={20} className="text-[#F5C518]" fill="currentColor" />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#F5C518] font-black text-xs uppercase tracking-widest" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                ⚡ Défi Flash
              </span>
              <motion.span
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                className="text-[10px] font-black text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded"
              >
                EN COURS
              </motion.span>
            </div>

            <p className="text-white font-black text-lg leading-tight" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {flagA} {teamA} — {teamB} {flagB}
            </p>

            <p className="text-white/45 text-xs mt-0.5">
              Pronostique maintenant ·{' '}
              <span className="text-[#F5C518] font-bold">+{challenge.bonus_coins} coins offerts</span>
            </p>
          </div>

          {/* Countdown */}
          <div className="text-right flex-shrink-0">
            <p className="text-white/30 text-[9px] font-semibold flex items-center gap-0.5 justify-end mb-1">
              <Clock size={9} /> Expire dans
            </p>
            <p
              className="font-black text-white tabular-nums text-xl leading-none"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
            </p>
          </div>

        </div>

        {/* CTA button */}
        <Link href={`/matches/${challenge.match_id}`}>
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-black cursor-pointer"
            style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #F5C518, #FFD700)',
              boxShadow: '0 4px 22px rgba(245,197,24,0.38)',
            }}
          >
            <Zap size={15} fill="currentColor" />
            PRONOSTIQUER CE MATCH · +{challenge.bonus_coins} COINS
            <ChevronRight size={15} />
          </motion.div>
        </Link>
      </div>
    </motion.div>
  )
}
