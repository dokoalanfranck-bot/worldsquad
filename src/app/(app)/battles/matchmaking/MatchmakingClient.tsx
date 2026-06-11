'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, X, Wifi } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

const TIPS = [
  'La cohésion est clé — 3 joueurs de la même nation donne +35 points',
  'Un coach de la même nationalité que tes joueurs booste la cohésion',
  'Les cartes Legend et Epic augmentent fortement la puissance de ton équipe',
  'Les stats de tes joueurs comptent : plus elles sont élevées, plus tu marques',
  'Équipe homogène > Équipe puissante mais incohérente',
]

export function MatchmakingClient({ userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState<'idle' | 'searching' | 'found'>('idle')
  const [dots, setDots] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  function cleanup() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (pollRef.current) clearInterval(pollRef.current)
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
  }

  async function startSearch() {
    setStatus('searching')
    setElapsed(0)

    // Subscribe to new battles where I'm opponent (matchmaker puts opponent second)
    const channel = supabase
      .channel(`matchmaking-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battles',
          filter: `opponent_id=eq.${userId}`,
        },
        (payload) => {
          const b = payload.new as { type: string; id: string }
          if (b.type === 'team_match') {
            setStatus('found')
            cleanup()
            setTimeout(() => router.push(`/battles/${b.id}/play`), 1200)
          }
        }
      )
      .subscribe()

    realtimeRef.current = channel

    // Attempt to join queue immediately
    const res = await fetch('/api/battles/queue/join', { method: 'POST' })
    const data = await res.json()

    if (data.battleId) {
      setStatus('found')
      cleanup()
      setTimeout(() => router.push(`/battles/${data.battleId}/play`), 1200)
      return
    }

    // Animate dots + tip rotation
    intervalRef.current = setInterval(() => {
      setDots((d) => (d + 1) % 4)
      setElapsed((e) => e + 1)
      setTipIdx((t) => (t + 1) % TIPS.length)
    }, 1500)

    // Poll every 3s as fallback
    pollRef.current = setInterval(async () => {
      const r = await fetch('/api/battles/queue/join', { method: 'POST' })
      const d = await r.json()
      if (d.battleId) {
        setStatus('found')
        cleanup()
        setTimeout(() => router.push(`/battles/${d.battleId}/play`), 1200)
      }
    }, 3000)
  }

  async function cancelSearch() {
    cleanup()
    await fetch('/api/battles/queue/leave', { method: 'DELETE' })
    setStatus('idle')
    setElapsed(0)
  }

  useEffect(() => {
    return () => {
      cleanup()
      // Leave queue on unmount
      fetch('/api/battles/queue/leave', { method: 'DELETE' }).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dotsStr = '.'.repeat(dots)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <AnimatePresence mode="wait">

        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-sm"
          >
            <div className="text-7xl mb-6">⚽</div>
            <h1 className="text-5xl font-black text-white mb-3" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              TEAM MATCH
            </h1>
            <p className="text-gray-400 text-sm mb-2">3 joueurs + 1 coach · Cohésion · Match 20s</p>
            <p className="text-gray-600 text-xs mb-8">Matchmaking automatique selon ton niveau</p>

            <div className="glass rounded-2xl p-5 mb-6 text-left space-y-3">
              {[
                { icon: '👥', label: 'Équipe', desc: 'Sélectionne 3 joueurs + 1 coach de ta collection' },
                { icon: '🔥', label: 'Cohésion', desc: 'Nation, rareté et stats déterminent ta force' },
                { icon: '⚽', label: 'Match 20s', desc: 'Simulation animée en temps réel sur le terrain' },
                { icon: '🏆', label: 'Résultat', desc: 'Le score final désigne le vainqueur' },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <p className="text-white font-bold text-sm">{step.label}</p>
                    <p className="text-gray-500 text-xs">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startSearch}
              className="w-full bg-[#F5C518] text-black font-black py-4 rounded-xl text-lg hover:bg-[#ffd700] transition-all flex items-center justify-center gap-2"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              <Swords size={20} /> CHERCHER UN ADVERSAIRE
            </motion.button>
          </motion.div>
        )}

        {status === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center max-w-sm"
          >
            {/* Radar animation */}
            <div className="relative w-40 h-40 mx-auto mb-8">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-[#F5C518]/30"
                  animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                  transition={{ duration: 2, delay: i * 0.6, repeat: Infinity }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#F5C518]/20 border border-[#F5C518]/40 flex items-center justify-center">
                  <Wifi className="text-[#F5C518]" size={28} />
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              RECHERCHE{dotsStr}
            </h2>
            <p className="text-gray-500 text-sm mb-1">
              {elapsed < 10 ? 'Recherche dans ton niveau...' :
               elapsed < 25 ? 'Élargissement de la recherche...' :
               'Recherche tous niveaux...'}
            </p>
            <p className="text-gray-700 text-xs mb-8">{elapsed}s</p>

            {/* Tip */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tipIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass rounded-xl p-3 mb-6 text-left"
              >
                <p className="text-xs text-gray-600 mb-1 font-semibold uppercase tracking-wider">Conseil</p>
                <p className="text-gray-300 text-sm">{TIPS[tipIdx]}</p>
              </motion.div>
            </AnimatePresence>

            <button
              onClick={cancelSearch}
              className="flex items-center gap-2 mx-auto text-gray-500 hover:text-white text-sm font-semibold transition-colors"
            >
              <X size={14} /> Annuler la recherche
            </button>
          </motion.div>
        )}

        {status === 'found' && (
          <motion.div
            key="found"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-7xl mb-4"
            >
              ⚔️
            </motion.div>
            <h2 className="text-4xl font-black text-[#F5C518] mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              ADVERSAIRE TROUVÉ !
            </h2>
            <p className="text-gray-400 text-sm animate-pulse">Préparation du battle...</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
