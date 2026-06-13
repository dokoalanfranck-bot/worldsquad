'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Trash2, Plus, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Match } from '@/types'
import type { FlashChallenge } from '@/lib/flash-challenges'

interface Props {
  upcomingMatches: Match[]
  activeChallenges: FlashChallenge[]
}

const DURATIONS = [
  { label: '1 heure', value: 1 },
  { label: '2 heures', value: 2 },
  { label: '4 heures', value: 4 },
  { label: '8 heures', value: 8 },
  { label: '24 heures', value: 24 },
]

export function FlashChallengesClient({ upcomingMatches, activeChallenges: initial }: Props) {
  const [challenges, setChallenges] = useState(initial)
  const [matchId, setMatchId] = useState('')
  const [label, setLabel] = useState('Défi Flash')
  const [bonusCoins, setBonusCoins] = useState(100)
  const [durationHours, setDurationHours] = useState(2)
  const [loading, setLoading] = useState(false)

  async function create() {
    if (!matchId) { toast.error('Choisis un match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/flash-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, label, bonusCoins, durationHours }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Défi Flash lancé !')
      setChallenges((prev) => [data.challenge, ...prev])
      setMatchId('')
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    await fetch('/api/admin/flash-challenges', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setChallenges((prev) => prev.filter((c) => c.id !== id))
    toast.success('Défi supprimé')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#F5C518]/15 flex items-center justify-center">
            <Zap size={20} className="text-[#F5C518]" fill="currentColor" />
          </div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            DÉFIS FLASH
          </h1>
        </div>
        <p className="text-white/30 text-sm ml-13">
          Lance un défi éphémère sur un match — les users qui pronostiquent pendant la fenêtre reçoivent un bonus de coins.
        </p>
      </div>

      {/* Create form */}
      <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
        <h2 className="text-white font-black text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          LANCER UN NOUVEAU DÉFI
        </h2>

        {/* Match select */}
        <div>
          <label className="text-white/40 text-xs font-bold uppercase tracking-widest block mb-2">Match</label>
          <select
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40"
          >
            <option value="">— Sélectionner un match —</option>
            {upcomingMatches.map((m) => (
              <option key={m.id} value={m.id} style={{ background: '#0A1525' }}>
                {m.flag_a ?? '🏳'} {m.team_a} vs {m.team_b} {m.flag_b ?? '🏳'} · {new Date(m.match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Label */}
          <div>
            <label className="text-white/40 text-xs font-bold uppercase tracking-widest block mb-2">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40"
              placeholder="Défi Flash"
            />
          </div>

          {/* Bonus coins */}
          <div>
            <label className="text-white/40 text-xs font-bold uppercase tracking-widest block mb-2">Bonus coins</label>
            <input
              type="number"
              value={bonusCoins}
              onChange={(e) => setBonusCoins(Number(e.target.value))}
              min={10}
              max={1000}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-white/40 text-xs font-bold uppercase tracking-widest block mb-2">Durée</label>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDurationHours(d.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  durationHours === d.value ? 'bg-[#F5C518] text-black' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                }`}
              >
                <Clock size={11} /> {d.label}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={create}
          disabled={loading || !matchId}
          className="w-full py-4 rounded-xl font-black text-black text-lg flex items-center justify-center gap-2 disabled:opacity-50"
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            background: 'linear-gradient(135deg, #F5C518, #FFD700)',
            boxShadow: '0 4px 20px rgba(245,197,24,0.35)',
          }}
        >
          <Plus size={18} />
          {loading ? 'Lancement…' : `LANCER LE DÉFI · +${bonusCoins} COINS · ${durationHours}H`}
        </motion.button>
      </div>

      {/* Active challenges */}
      <div>
        <h2 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">
          Défis actifs ({challenges.length})
        </h2>
        <AnimatePresence>
          {challenges.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-6">Aucun défi actif</p>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass rounded-xl p-4 border border-[#F5C518]/20 flex items-center gap-3"
                >
                  <Zap size={16} className="text-[#F5C518] flex-shrink-0" fill="currentColor" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{c.label}</p>
                    <p className="text-white/40 text-xs">
                      +{c.bonus_coins} coins · Expire{' '}
                      {new Date(c.ends_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(c.id)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
