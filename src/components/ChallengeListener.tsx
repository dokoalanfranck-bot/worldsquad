'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface PendingChallenge {
  duelId: string
  challengerPseudo: string
  challengerNation: string
  stakeCount: number
}

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪',
  Japan: '🇯🇵', Senegal: '🇸🇳', Croatia: '🇭🇷', Uruguay: '🇺🇾',
}

export function ChallengeListener({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [challenge, setChallenge] = useState<PendingChallenge | null>(null)
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)

  async function resolveChallenge(duelId: string, challengerId: string, stakeCount: number) {
    const { data } = await supabase
      .from('users')
      .select('pseudo, nation')
      .eq('id', challengerId)
      .single()
    if (data) {
      setChallenge({ duelId, challengerPseudo: data.pseudo, challengerNation: data.nation, stakeCount: stakeCount ?? 1 })
    }
  }

  // Check for pending invites on mount (user opened app while challenge was waiting)
  useEffect(() => {
    let cancelled = false
    async function checkPending() {
      const { data } = await supabase
        .from('duels')
        .select('id, challenger_id, stake_count')
        .eq('opponent_id', userId)
        .eq('status', 'invited')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled && data) {
        await resolveChallenge(data.id, data.challenger_id, data.stake_count ?? 1)
      }
    }
    checkPending()
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: new invited duel where I'm the opponent
  useEffect(() => {
    const ch = supabase
      .channel(`challenge-listener-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'duels', filter: `opponent_id=eq.${userId}` },
        async ({ new: row }) => {
          if (row.status !== 'invited') return
          await resolveChallenge(row.id, row.challenger_id, row.stake_count ?? 1)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function accept() {
    if (!challenge || loading) return
    setLoading('accept')
    try {
      const res = await fetch(`/api/duels/${challenge.duelId}/accept-invite`, { method: 'POST' })
      if (!res.ok) { toast.error('Invitation expirée'); setChallenge(null); return }
      setChallenge(null)
      router.push(`/battles/duel/${challenge.duelId}`)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(null)
    }
  }

  async function decline() {
    if (!challenge || loading) return
    setLoading('decline')
    try {
      await fetch(`/api/duels/${challenge.duelId}/decline-invite`, { method: 'POST' })
      setChallenge(null)
    } catch { /* ignore */ }
    finally { setLoading(null) }
  }

  return (
    <AnimatePresence>
      {challenge && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-sm rounded-3xl p-6 pointer-events-auto border border-[#F5C518]/20"
              style={{
                background: 'var(--bg-elevated, #0d1f35)',
                boxShadow: '0 0 80px rgba(245,197,24,0.2), 0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              {/* Glow icon */}
              <div className="relative mx-auto mb-5 w-20 h-20">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-[#F5C518]/30"
                    animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
                    transition={{ duration: 1.8, delay: i * 0.55, repeat: Infinity }}
                  />
                ))}
                <div className="absolute inset-0 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/30 flex items-center justify-center">
                  <Swords size={32} className="text-[#F5C518]" />
                </div>
              </div>

              <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-1">Défi reçu ⚔️</p>
              <h2
                className="text-center text-3xl font-black text-white mb-1"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {NATION_FLAGS[challenge.challengerNation] ?? '🌍'} {challenge.challengerPseudo}
              </h2>
              <p className="text-center text-gray-400 text-sm mb-6">
                te défie pour{' '}
                <span className="text-[#F5C518] font-bold">
                  {challenge.stakeCount} carte{challenge.stakeCount > 1 ? 's' : ''}
                </span>
              </p>

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={decline}
                  disabled={!!loading}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold disabled:opacity-40 hover:bg-white/10 transition-colors"
                >
                  {loading === 'decline'
                    ? <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                    : <><X size={15} /> Refuser</>
                  }
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={accept}
                  disabled={!!loading}
                  className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-xl bg-[#F5C518] text-black font-black disabled:opacity-40 hover:brightness-105 transition-all"
                  style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem' }}
                >
                  {loading === 'accept'
                    ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    : <><Check size={17} /> ACCEPTER</>
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
