'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Swords, Trophy, Target, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface FeatureFlag {
  key: string
  enabled: boolean
  label: string
  description: string
  updated_at: string
}

const FLAG_ICONS: Record<string, React.ElementType> = {
  battles_enabled:         Swords,
  tournaments_enabled:     Trophy,
  penalty_battles_enabled: Target,
  predictions_enabled:     TrendingUp,
}

export function SettingsClient({ initialFlags }: { initialFlags: FeatureFlag[] }) {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags)
  const [loading, setLoading] = useState<string | null>(null)

  async function toggle(key: string, newValue: boolean) {
    setLoading(key)
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: newValue }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Erreur')
        return
      }
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: newValue, updated_at: new Date().toISOString() } : f))
      toast.success(newValue ? `${key} activé` : `${key} désactivé`)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-bebas text-4xl text-white">PARAMÈTRES</h1>
        <p className="text-white/50 text-sm mt-1">Activer ou désactiver les modes de jeu</p>
      </div>

      <div className="glass rounded-2xl divide-y divide-white/5">
        {flags.map((flag, i) => {
          const Icon = FLAG_ICONS[flag.key] ?? Settings
          const isLoading = loading === flag.key
          return (
            <motion.div
              key={flag.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between px-5 py-4 gap-4"
            >
              {/* Left: icon + info */}
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  flag.enabled ? 'bg-green-500/15 text-green-400' : 'bg-red-500/10 text-red-400/60'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm">{flag.label}</p>
                  <p className="text-white/40 text-xs mt-0.5 truncate">{flag.description}</p>
                </div>
              </div>

              {/* Right: status badge + toggle */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  flag.enabled ? 'bg-green-500/15 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {flag.enabled
                    ? <><CheckCircle className="w-3 h-3" /> Actif</>
                    : <><XCircle className="w-3 h-3" /> Inactif</>
                  }
                </span>

                {/* Toggle switch */}
                <button
                  onClick={() => !isLoading && toggle(flag.key, !flag.enabled)}
                  disabled={isLoading}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-60 ${
                    flag.enabled ? 'bg-green-500' : 'bg-white/15'
                  }`}
                >
                  <motion.div
                    animate={{ x: flag.enabled ? 24 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              </div>
            </motion.div>
          )
        })}

        {flags.length === 0 && (
          <div className="px-5 py-12 text-center text-white/30 text-sm">
            Aucun flag configuré — appliquez la migration 028 dans Supabase
          </div>
        )}
      </div>

      <p className="text-white/25 text-xs">
        Les changements prennent effet immédiatement. Les joueurs en cours de partie ne sont pas interrompus.
      </p>
    </div>
  )
}
