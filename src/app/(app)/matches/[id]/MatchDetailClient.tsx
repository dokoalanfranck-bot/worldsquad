'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Match, Prediction } from '@/types'

interface Props {
  match: Match
  currentPrediction: Prediction | null
  groupPredictions: (Prediction & { user: { pseudo: string; photo_url: string | null; nation: string } | null })[]
  userId: string
}

function ScorePicker({
  label,
  flag,
  value,
  onChange,
  disabled,
}: {
  label: string
  flag: string
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-5xl">{flag}</div>
      <div
        className="font-black text-white text-lg text-center"
        style={{ fontFamily: 'Bebas Neue, sans-serif' }}
      >
        {label}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={disabled || value <= 0}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-black text-xl transition-colors"
        >
          −
        </button>
        <motion.div
          key={value}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
          style={{ boxShadow: '0 0 20px rgba(245,197,24,0.1)' }}
        >
          <span
            className="text-3xl font-black text-[#F5C518]"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            {value}
          </span>
        </motion.div>
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          disabled={disabled || value >= 20}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-black text-xl transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function MatchDetailClient({ match, currentPrediction, groupPredictions, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [scoreA, setScoreA] = useState(currentPrediction?.pred_score_a ?? 1)
  const [scoreB, setScoreB] = useState(currentPrediction?.pred_score_b ?? 1)
  const [scorer, setScorer] = useState(currentPrediction?.pred_scorer ?? '')
  const [loading, setLoading] = useState(false)

  const isLocked = match.status !== 'upcoming'
  const hasPrediction = !!currentPrediction

  async function handleSubmit() {
    if (isLocked) {
      toast.error('Les pronostics sont verrouillés — le match a commencé !')
      return
    }

    setLoading(true)
    try {
      const payload = {
        user_id: userId,
        match_id: match.id,
        pred_score_a: scoreA,
        pred_score_b: scoreB,
        pred_scorer: scorer || null,
      }

      if (hasPrediction) {
        const { error } = await supabase
          .from('predictions')
          .update(payload)
          .eq('id', currentPrediction!.id)
        if (error) throw error
        toast.success('✅ Pronostic mis à jour !')
      } else {
        const { error } = await supabase.from('predictions').insert(payload)
        if (error) throw error
        toast.success('⚽ Pronostic enregistré !')
      }

      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const matchDate = new Date(match.match_date)

  return (
    <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">
      {/* Match header */}
      <div className="glass-elevated rounded-2xl p-6 mb-6 text-center">
        <div className="flex items-center justify-between mb-2">
          {match.group_name && (
            <span className="text-xs text-gray-500 font-bold uppercase">
              Groupe {match.group_name}
            </span>
          )}
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ml-auto ${
              match.status === 'live'
                ? 'text-green-400 bg-green-400/10 animate-pulse'
                : match.status === 'finished'
                ? 'text-gray-500 bg-white/5'
                : 'text-[#F5C518] bg-[#F5C518]/10'
            }`}
          >
            {match.status === 'live' ? '🔴 EN DIRECT' : match.status === 'finished' ? 'Terminé' : '🕐 À venir'}
          </span>
        </div>

        <p className="text-gray-500 text-sm mb-4">
          {matchDate.toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </p>

        {/* Live / Final score */}
        {match.status !== 'upcoming' && match.score_a !== null && (
          <div
            className="text-5xl font-black text-white mb-4"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            <span>{match.flag_a ?? '🏳'}</span>
            <span className="mx-4 text-[#F5C518]">
              {match.score_a} — {match.score_b}
            </span>
            <span>{match.flag_b ?? '🏳'}</span>
          </div>
        )}
      </div>

      {/* Prediction form */}
      <div className="glass-elevated rounded-2xl p-6 mb-6">
        <h2
          className="text-2xl font-black text-white mb-1"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          {isLocked ? 'TON PRONOSTIC' : hasPrediction ? 'MODIFIER TON PRONOSTIC' : 'FAIRE TON PRONOSTIC'}
        </h2>
        {isLocked && (
          <p className="text-red-400 text-sm mb-4 font-semibold">
            🔒 Pronostics verrouillés — match commencé
          </p>
        )}

        <div className="flex items-center justify-around py-6">
          <ScorePicker
            label={match.team_a}
            flag={match.flag_a ?? '🏳'}
            value={scoreA}
            onChange={setScoreA}
            disabled={isLocked}
          />
          <div
            className="text-4xl font-black text-gray-600"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            —
          </div>
          <ScorePicker
            label={match.team_b}
            flag={match.flag_b ?? '🏳'}
            value={scoreB}
            onChange={setScoreB}
            disabled={isLocked}
          />
        </div>

        {!isLocked && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Buteur (optionnel)
            </label>
            <input
              type="text"
              value={scorer}
              onChange={(e) => setScorer(e.target.value)}
              placeholder="ex: Mbappé"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/50 transition-all"
            />
          </div>
        )}

        {/* Gain preview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {GAINS.map((g) => (
            <div key={g.label} className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[#F5C518] font-black text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                +{g.coins} 🪙
              </div>
              <div className="text-gray-500 text-xs mt-0.5">{g.label}</div>
            </div>
          ))}
        </div>

        {!isLocked && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#F5C518] hover:bg-[#ffd700] disabled:opacity-50 text-black font-black py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', letterSpacing: '0.05em' }}
          >
            {loading ? 'ENREGISTREMENT...' : hasPrediction ? '✅ METTRE À JOUR' : '⚽ VALIDER MON PRONOSTIC'}
          </button>
        )}

        {hasPrediction && currentPrediction.status !== 'pending' && (
          <div className={`mt-4 p-4 rounded-xl text-center font-bold ${
            currentPrediction.status === 'correct_score'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : currentPrediction.status === 'correct_winner'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {currentPrediction.status === 'correct_score' && `🎯 Score exact ! +300 🪙`}
            {currentPrediction.status === 'correct_winner' && `✅ Bon vainqueur ! +100 🪙`}
            {currentPrediction.status === 'wrong' && `❌ Pas cette fois...`}
          </div>
        )}
      </div>

      {/* Group predictions (visible after kick-off) */}
      {groupPredictions.length > 0 && (
        <div className="glass-elevated rounded-2xl p-6">
          <h3
            className="text-xl font-black text-white mb-4"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            PRONOSTICS DU GROUPE ({groupPredictions.length})
          </h3>
          <div className="space-y-3">
            {groupPredictions.map((pred) => (
              <div key={pred.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F5C518]/20 flex items-center justify-center text-sm font-bold text-white">
                    {pred.user?.pseudo?.slice(0, 1) ?? '?'}
                  </div>
                  <span className="text-white font-semibold text-sm">{pred.user?.pseudo}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-[#F5C518]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    {pred.pred_score_a} — {pred.pred_score_b}
                  </span>
                  {pred.status !== 'pending' && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      pred.status === 'correct_score'
                        ? 'text-green-400 bg-green-400/10'
                        : pred.status === 'correct_winner'
                        ? 'text-blue-400 bg-blue-400/10'
                        : 'text-red-400 bg-red-400/10'
                    }`}>
                      {pred.status === 'correct_score' ? '+300' : pred.status === 'correct_winner' ? '+100' : '0'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const GAINS = [
  { label: 'Score exact', coins: 300 },
  { label: 'Bon vainqueur', coins: 100 },
  { label: 'Bon buteur', coins: 150 },
]
