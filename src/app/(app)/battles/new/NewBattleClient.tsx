'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GameCard } from '@/components/ui/Card'
import type { Card } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  groupMembers: { id: string; pseudo: string; photo_url: string | null; nation: string }[]
  myCards: Card[]
  maxCoins: number
  currentUserId: string
}

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾', Italy: '🇮🇹',
  USA: '🇺🇸', Mexico: '🇲🇽', Canada: '🇨🇦', Morocco: '🇲🇦',
}

export function NewBattleClient({ groupMembers, myCards, maxCoins, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [opponent, setOpponent] = useState<Props['groupMembers'][0] | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [stake, setStake] = useState(100)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!opponent || !selectedCard) return
    setLoading(true)

    try {
      const { error } = await supabase.from('battles').insert({
        challenger_id: currentUserId,
        opponent_id: opponent.id,
        challenger_card_id: selectedCard.id,
        coins_stake: stake,
        status: 'pending',
      })
      if (error) throw error

      // Log activity
      const { data: membership } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUserId)
        .single()
      if (membership) {
        await supabase.from('group_activities').insert({
          group_id: membership.group_id,
          user_id: currentUserId,
          activity_type: 'battle_challenge',
          message: `a défié ${opponent.pseudo} en battle pour ${stake} coins ⚔️`,
        })
      }

      toast.success(`Défi envoyé à ${opponent.pseudo} !`)
      router.push('/battles')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">
      <h1 className="text-4xl font-black text-white mb-8" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
        NOUVEAU BATTLE
      </h1>

      {/* Step 1: Choose opponent */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-lg font-bold text-gray-400 mb-4">1. Choisis ton adversaire</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {groupMembers.map((member) => (
              <motion.button
                key={member.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setOpponent(member); setStep(2) }}
                className="glass rounded-xl p-4 border border-white/5 hover:border-[#F5C518]/30 text-center transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#F5C518]/20 flex items-center justify-center text-white font-black mx-auto mb-2 overflow-hidden">
                  {member.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.photo_url} alt={member.pseudo} className="w-full h-full object-cover" />
                  ) : member.pseudo.slice(0, 1)}
                </div>
                <p className="text-white font-bold text-sm">{member.pseudo}</p>
                <p className="text-gray-600 text-xs">{NATION_FLAGS[member.nation] ?? '🌍'} {member.nation}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Step 2: Choose your card */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep(1)} className="text-gray-500 hover:text-white transition-colors">← Retour</button>
            <h2 className="text-lg font-bold text-gray-400">2. Choisis ta carte vs <span className="text-white">{opponent?.pseudo}</span></h2>
          </div>
          {myCards.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-gray-500">Tu n&apos;as pas de cartes. Ouvre des packs d&apos;abord !</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
              {myCards.map((card) => (
                <div key={card.id} className={selectedCard?.id === card.id ? 'ring-2 ring-[#F5C518] rounded-xl' : ''}>
                  <GameCard
                    card={card}
                    owned
                    size="sm"
                    selected={selectedCard?.id === card.id}
                    onClick={() => setSelectedCard(card)}
                  />
                </div>
              ))}
            </div>
          )}
          {selectedCard && (
            <button
              onClick={() => setStep(3)}
              className="w-full mt-6 bg-[#F5C518] text-black font-black py-3 rounded-xl hover:bg-[#ffd700] transition-all"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              SUIVANT →
            </button>
          )}
        </motion.div>
      )}

      {/* Step 3: Set stake */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep(2)} className="text-gray-500 hover:text-white transition-colors">← Retour</button>
            <h2 className="text-lg font-bold text-gray-400">3. Définis la mise</h2>
          </div>

          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                {selectedCard && <GameCard card={selectedCard} owned size="md" />}
                <p className="text-white font-bold text-sm mt-2">Ta carte</p>
              </div>
              <div className="text-4xl font-black text-gray-500" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>⚔️</div>
              <div className="text-center">
                <div className="w-28 h-40 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
                  {opponent ? (NATION_FLAGS[opponent.nation] ?? '🌍') : '?'}
                </div>
                <p className="text-white font-bold text-sm mt-2">{opponent?.pseudo}</p>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-400 mb-3">
                Mise : <span className="text-[#F5C518] font-black text-lg">{stake} 🪙</span>
              </label>
              <input
                type="range"
                min={50}
                max={Math.min(500, maxCoins)}
                step={50}
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
                className="w-full accent-[#F5C518]"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>50 🪙</span>
                <span>{Math.min(500, maxCoins)} 🪙 max</span>
              </div>
              <p className="text-gray-600 text-xs mt-2 text-center">
                Ton solde : {maxCoins.toLocaleString()} coins
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#F5C518] disabled:opacity-50 text-black font-black py-4 rounded-xl hover:bg-[#ffd700] transition-all hover:scale-[1.02]"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem' }}
          >
            {loading ? 'ENVOI DU DÉFI...' : `⚔️ LANCER LE BATTLE — ${stake} COINS`}
          </button>
        </motion.div>
      )}
    </div>
  )
}
