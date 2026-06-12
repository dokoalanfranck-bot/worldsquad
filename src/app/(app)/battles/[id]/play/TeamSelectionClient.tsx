'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GameCard } from '@/components/ui/Card'
import { Clock, Star, Users, ChevronRight } from 'lucide-react'
import { computeCohesion } from '@/lib/battle-engine'
import type { Card } from '@/types'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Battle = Record<string, any>

interface Props {
  battle: Battle
  currentUserId: string
  myCards: Card[]
}

const RARITY_ORDER: Record<string, number> = { Legend: 4, Epic: 3, Rare: 2, Common: 1 }

function isCoachCard(card: Card): boolean {
  return String(card.stats?.position ?? '').toUpperCase() === 'COACH'
    || (card.description ?? '').includes('Coach')
}

export function TeamSelectionClient({ battle, currentUserId, myCards }: Props) {
  const [selectedPlayers, setSelectedPlayers] = useState<Card[]>([])
  const [selectedCoach, setSelectedCoach] = useState<Card | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const isChallenger = battle.challenger_id === currentUserId
  const me = isChallenger ? battle.challenger : battle.opponent
  const them = isChallenger ? battle.opponent : battle.challenger
  const alreadySubmitted = isChallenger ? !!battle.challenger_team : !!battle.opponent_team

  const playerCards = useMemo(
    () => myCards
      .filter((c) => !isCoachCard(c))
      .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0)),
    [myCards]
  )

  const coachCards = useMemo(
    () => myCards
      .filter(isCoachCard)
      .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0)),
    [myCards]
  )

  // Aperçu cohésion en temps réel
  const cohesionPreview = useMemo(() => {
    if (selectedPlayers.length === 3 && selectedCoach) {
      return computeCohesion({ players: selectedPlayers, coach: selectedCoach })
    }
    return null
  }, [selectedPlayers, selectedCoach])

  function cohesionColor(c: number) {
    if (c >= 80) return '#f59e0b'
    if (c >= 60) return '#22c55e'
    if (c >= 40) return '#3b82f6'
    return '#6b7280'
  }

  function togglePlayer(card: Card) {
    if (selectedPlayers.find((c) => c.id === card.id)) {
      setSelectedPlayers((prev) => prev.filter((c) => c.id !== card.id))
    } else if (selectedPlayers.length < 3) {
      setSelectedPlayers((prev) => [...prev, card])
    }
  }

  async function handleConfirm() {
    if (selectedPlayers.length !== 3 || !selectedCoach) return
    setLoading(true)
    try {
      const res = await fetch(`/api/battles/${battle.id}/select-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIds: selectedPlayers.map((c) => c.id),
          coachId: selectedCoach.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setSubmitted(true)
      toast.success('Équipe confirmée !')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  // Auto-recovery: if human team is already saved but bot hasn't responded, re-trigger after 2s
  useEffect(() => {
    if (!alreadySubmitted && !submitted) return
    const t = setTimeout(() => {
      fetch(`/api/battles/${battle.id}/trigger-bot`, { method: 'POST' }).catch(() => {})
    }, 2000)
    return () => clearTimeout(t)
  }, [alreadySubmitted, submitted, battle.id])

  if (alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-2xl p-8 text-center max-w-sm w-full"
        >
          <Clock className="w-10 h-10 text-[#F5C518] mx-auto mb-3 animate-pulse" />
          <p className="text-white font-bold text-lg mb-1">Équipe confirmée</p>
          <p className="text-gray-400 text-sm">En attente de {them?.pseudo}…</p>
        </motion.div>

        {/* Aperçu équipe */}
        {selectedPlayers.length === 3 && selectedCoach && (
          <div className="glass rounded-xl p-4 max-w-sm w-full">
            <p className="text-gray-500 text-xs mb-3 font-semibold uppercase tracking-wide">Ton équipe</p>
            <div className="grid grid-cols-4 gap-2">
              {selectedPlayers.map((p) => (
                <GameCard key={p.id} card={p} owned size="sm" />
              ))}
              <div className="relative">
                <GameCard card={selectedCoach} owned size="sm" />
                <div className="absolute -top-1 -right-1 bg-[#F5C518] text-black text-[8px] font-black px-1 rounded">COACH</div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-gray-500 text-xs">BATTLE · {me?.pseudo} vs {them?.pseudo}</p>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            SÉLECTIONNE TON ÉQUIPE
          </h1>
        </div>
        {/* Cohesion badge */}
        {cohesionPreview !== null && (
          <motion.div
            key={cohesionPreview}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="glass rounded-xl px-3 py-2 text-center"
          >
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Cohésion</p>
            <p className="text-xl font-black" style={{ color: cohesionColor(cohesionPreview), fontFamily: 'Bebas Neue, sans-serif' }}>
              {cohesionPreview}
            </p>
          </motion.div>
        )}
      </div>

      {/* Cohesion bar */}
      {cohesionPreview !== null && (
        <div className="mb-5">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${cohesionPreview}%` }}
              transition={{ type: 'spring', stiffness: 120 }}
              className="h-full rounded-full"
              style={{ backgroundColor: cohesionColor(cohesionPreview) }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {[25, 50, 75, 100].map((v) => (
              <span key={v} className="text-[9px] text-gray-600">{v}</span>
            ))}
          </div>
        </div>
      )}

      {/* Slots sélectionnés */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`aspect-[2/3] rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${
            selectedPlayers[i] ? 'border-[#F5C518]/40' : 'border-white/10'
          }`}>
            {selectedPlayers[i] ? (
              <GameCard card={selectedPlayers[i]} owned size="sm" />
            ) : (
              <div className="text-center">
                <Users className="w-4 h-4 text-gray-700 mx-auto" />
                <p className="text-[9px] text-gray-700 mt-1">Joueur {i + 1}</p>
              </div>
            )}
          </div>
        ))}
        <div className={`aspect-[2/3] rounded-xl border-2 border-dashed flex items-center justify-center transition-all relative ${
          selectedCoach ? 'border-[#F5C518]/40' : 'border-white/10'
        }`}>
          {selectedCoach ? (
            <>
              <GameCard card={selectedCoach} owned size="sm" />
              <div className="absolute -top-1 -right-1 bg-[#F5C518] text-black text-[8px] font-black px-1 rounded">COACH</div>
            </>
          ) : (
            <div className="text-center">
              <Star className="w-4 h-4 text-gray-700 mx-auto" />
              <p className="text-[9px] text-gray-700 mt-1">Coach</p>
            </div>
          )}
        </div>
      </div>

      {/* Section joueurs */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white font-bold text-sm">Joueurs <span className="text-gray-600">({selectedPlayers.length}/3)</span></p>
          <p className="text-[10px] text-gray-600">{playerCards.length} cartes</p>
        </div>
        <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto pr-1">
          {playerCards.map((card) => {
            const sel = !!selectedPlayers.find((c) => c.id === card.id)
            const disabled = !sel && selectedPlayers.length >= 3
            return (
              <motion.div
                key={card.id}
                whileTap={disabled ? {} : { scale: 0.92 }}
                className={`rounded-xl transition-all ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${sel ? 'ring-2 ring-[#F5C518]' : ''}`}
                onClick={() => !disabled && togglePlayer(card)}
              >
                <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Section coach */}
      {coachCards.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-bold text-sm">Coach <span className="text-gray-600">(1)</span></p>
            <p className="text-[10px] text-gray-600">{coachCards.length} coach{coachCards.length > 1 ? 's' : ''}</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {coachCards.map((card) => {
              const sel = selectedCoach?.id === card.id
              return (
                <motion.div
                  key={card.id}
                  whileTap={{ scale: 0.92 }}
                  className={`rounded-xl cursor-pointer transition-all relative ${sel ? 'ring-2 ring-[#F5C518]' : ''}`}
                  onClick={() => setSelectedCoach(sel ? null : card)}
                >
                  <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                  <div className="absolute -top-1 -right-1 bg-[#F5C518] text-black text-[8px] font-black px-1 rounded">C</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Si pas de cartes coach → utiliser n'importe quelle carte */}
      {coachCards.length === 0 && (
        <div className="mb-4">
          <p className="text-white font-bold text-sm mb-2">
            Coach <span className="text-gray-500 text-xs">(choisis n&apos;importe quelle carte)</span>
          </p>
          <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
            {myCards
              .filter((c) => !selectedPlayers.find((p) => p.id === c.id))
              .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))
              .map((card) => {
                const sel = selectedCoach?.id === card.id
                return (
                  <motion.div
                    key={card.id}
                    whileTap={{ scale: 0.92 }}
                    className={`rounded-xl cursor-pointer transition-all ${sel ? 'ring-2 ring-[#F5C518]' : ''}`}
                    onClick={() => setSelectedCoach(sel ? null : card)}
                  >
                    <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                  </motion.div>
                )
              })}
          </div>
        </div>
      )}

      {/* Bouton fixe en bas */}
      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-2xl mx-auto">
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={selectedPlayers.length !== 3 || !selectedCoach || loading}
          onClick={handleConfirm}
          className="w-full bg-[#F5C518] disabled:opacity-30 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          {loading ? 'Confirmation…' : (
            <>
              CONFIRMER MON ÉQUIPE <ChevronRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
}
