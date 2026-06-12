'use client'

import { useState, useRef, useEffect } from 'react'
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
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const hasMatchedRef = useRef(false)
  const botTriggeredRef = useRef(false)

  function cleanup() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (pollRef.current) clearInterval(pollRef.current)
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current)
    if (channelRef.current) {
      channelRef.current.untrack()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  function navigateToBattle(battleId: string) {
    if (hasMatchedRef.current) return
    hasMatchedRef.current = true
    setStatus('found')
    cleanup()
    setTimeout(() => router.push(`/battles/${battleId}/play`), 1200)
  }

  async function startSearch() {
    setStatus('searching')
    setElapsed(0)
    hasMatchedRef.current = false
    botTriggeredRef.current = false

    // After 20 real seconds with no human found, silently create a bot match
    botTimeoutRef.current = setTimeout(async () => {
      if (hasMatchedRef.current || botTriggeredRef.current) return
      botTriggeredRef.current = true
      try {
        const res = await fetch('/api/battles/create-bot-match', { method: 'POST' })
        const data = await res.json() as { battleId?: string }
        if (data.battleId) navigateToBattle(data.battleId)
        else botTriggeredRef.current = false
      } catch {
        botTriggeredRef.current = false
      }
    }, 20000)

    // Canal Presence partagé par tous les joueurs qui cherchent
    const ch = supabase.channel('matchmaking-global', {
      config: { presence: { key: userId } },
    })

    // 1. Broadcast: le créateur notifie tout le monde quand la battle est faite
    ch.on('broadcast', { event: 'match_found' }, ({ payload }) => {
      const p = payload as { battleId: string; players: string[] }
      if (p.players.includes(userId)) {
        navigateToBattle(p.battleId)
      }
    })

    // 2. Presence sync: dès que 2 joueurs sont présents, le "plus petit" userId crée
    ch.on('presence', { event: 'sync' }, async () => {
      if (hasMatchedRef.current) return

      const state = ch.presenceState<{ userId: string }>()
      const allUsers: string[] = Object.values(state)
        .flat()
        .map((p) => (p as { userId: string }).userId)
        .filter(Boolean)
        .sort()

      if (allUsers.length < 2) return
      // Seul le joueur avec le plus petit userId crée le battle
      if (allUsers[0] !== userId) return

      hasMatchedRef.current = true
      const opponentId = allUsers[1]

      try {
        const res = await fetch('/api/battles/create-team-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opponentId }),
        })
        const data = await res.json()

        if (data.battleId) {
          // Notifie l'adversaire via broadcast
          await ch.send({
            type: 'broadcast',
            event: 'match_found',
            payload: { battleId: data.battleId, players: [userId, opponentId] },
          })
          navigateToBattle(data.battleId)
        } else {
          hasMatchedRef.current = false
        }
      } catch {
        hasMatchedRef.current = false
      }
    })

    // Subscribe puis tracker sa présence
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ userId })
      }
    })

    channelRef.current = ch

    // Animation
    intervalRef.current = setInterval(() => {
      setDots((d) => (d + 1) % 4)
      setElapsed((e) => e + 1)
      setTipIdx((t) => (t + 1) % TIPS.length)
    }, 1500)

    // Polling fallback toutes les 3s (si broadcast manqué)
    pollRef.current = setInterval(async () => {
      if (hasMatchedRef.current) return
      try {
        const r = await fetch('/api/battles/queue/check')
        const d = await r.json()
        if (d.battleId) navigateToBattle(d.battleId)
      } catch { /* réseau */ }
    }, 3000)
  }

  async function cancelSearch() {
    cleanup()
    hasMatchedRef.current = false
    botTriggeredRef.current = false
    setStatus('idle')
    setElapsed(0)
  }

  useEffect(() => {
    return () => { cleanup() }
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
              {elapsed < 10 ? 'En attente d\'un adversaire...' :
               elapsed < 25 ? 'Toujours en recherche...' :
               'Recherche active...'}
            </p>
            <p className="text-gray-700 text-xs mb-8">{elapsed}s</p>

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
