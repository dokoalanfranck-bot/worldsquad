'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Gift, Swords, CheckCircle2, Circle, Flame, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import type { DailyMissionsRow } from '@/lib/missions'
import { MISSION_REWARDS } from '@/lib/missions'

interface Props {
  initial: DailyMissionsRow | null
  streak: number
}

const MISSIONS = [
  {
    key: 'prediction_done' as const,
    icon: Target,
    label: 'Faire 1 pronostic',
    sub: '/matches',
    coins: MISSION_REWARDS.prediction,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    key: 'pack_done' as const,
    icon: Gift,
    label: 'Ouvrir 1 pack',
    sub: '/packs',
    coins: MISSION_REWARDS.pack,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    key: 'battle_won' as const,
    icon: Swords,
    label: 'Gagner 1 battle',
    sub: '/battles',
    coins: MISSION_REWARDS.battle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
]

export function DailyMissions({ initial, streak }: Props) {
  const router = useRouter()
  const [missions, setMissions] = useState<DailyMissionsRow | null>(initial)
  const [claiming, setClaiming] = useState(false)

  if (!missions) return null

  const doneCount = [missions.prediction_done, missions.pack_done, missions.battle_won].filter(Boolean).length
  const allDone = doneCount === 3
  const bonusReady = allDone && !missions.bonus_claimed

  async function handleClaimBonus() {
    if (claiming) return
    setClaiming(true)
    try {
      const res = await fetch('/api/missions/bonus', { method: 'POST' })
      const data = await res.json() as { coins?: number; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setMissions((m) => m ? { ...m, bonus_claimed: true } : m)
      toast.success(`+${data.coins} coins — Missions complètes !`)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="glass rounded-2xl border border-white/5 overflow-hidden mb-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-widest">Missions du jour</p>
          <p className="text-white font-bold text-sm mt-0.5">
            {doneCount < 3 ? `${doneCount}/3 complétées` : 'Tout complété !'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-xl">
          <Flame size={12} className="text-orange-400" />
          <span className="text-orange-400 font-black text-xs">{streak}j</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: allDone
                ? 'linear-gradient(90deg, #F5C518, #FFD700)'
                : 'linear-gradient(90deg, #009ADE, #00C4FF)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${(doneCount / 3) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Mission rows */}
      <div className="px-4 py-2 space-y-2">
        {MISSIONS.map(({ key, icon: Icon, label, coins, color, bg, border }) => {
          const done = missions[key]
          return (
            <motion.div
              key={key}
              layout
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                done
                  ? 'bg-white/3 border-white/5 opacity-60'
                  : `${bg} ${border}`
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-white/5' : bg}`}>
                <Icon size={15} className={done ? 'text-white/20' : color} />
              </div>
              <span className={`flex-1 text-sm font-semibold ${done ? 'text-white/30 line-through' : 'text-white'}`}>
                {label}
              </span>
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="done"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle2 size={18} className="text-green-400" />
                  </motion.div>
                ) : (
                  <motion.div key="pending" className="flex items-center gap-1">
                    <span className={`text-xs font-black ${color}`}>+{coins}</span>
                    <Circle size={16} className="text-white/15" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Bonus section */}
      <div className="px-4 pb-4 pt-2">
        <AnimatePresence mode="wait">
          {missions.bonus_claimed ? (
            <motion.div
              key="claimed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/3 border border-white/5"
            >
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-green-400 text-xs font-bold">Bonus +{MISSION_REWARDS.bonus} coins réclamé !</span>
            </motion.div>
          ) : bonusReady ? (
            <motion.button
              key="claim"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleClaimBonus}
              disabled={claiming}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-black disabled:opacity-70"
              style={{
                background: 'linear-gradient(135deg, #F5C518, #FFD700)',
                boxShadow: '0 0 20px rgba(245,197,24,0.4)',
              }}
            >
              <Zap size={15} />
              {claiming ? 'Réclamation…' : `BONUS : +${MISSION_REWARDS.bonus} COINS`}
            </motion.button>
          ) : (
            <motion.div
              key="locked"
              className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/3 border border-white/5"
            >
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-white/20" />
                <span className="text-white/30 text-xs font-semibold">Bonus débloqué si tout complété</span>
              </div>
              <span className="text-[#F5C518] text-xs font-black">+{MISSION_REWARDS.bonus}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
