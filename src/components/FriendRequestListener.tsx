'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface PendingRequest {
  friendshipId: string
  requesterId: string
  requesterPseudo: string
  requesterNation: string
  requesterPhoto: string | null
}

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪',
  Japan: '🇯🇵', Senegal: '🇸🇳', Croatia: '🇭🇷', Uruguay: '🇺🇾',
}

export function FriendRequestListener({ userId }: { userId: string }) {
  const supabase = createClient()
  const [request, setRequest] = useState<PendingRequest | null>(null)
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)

  async function resolveRequest(friendshipId: string, requesterId: string) {
    const { data } = await supabase
      .from('users')
      .select('pseudo, nation, photo_url')
      .eq('id', requesterId)
      .single()
    if (data) {
      setRequest({
        friendshipId,
        requesterId,
        requesterPseudo: data.pseudo,
        requesterNation: data.nation,
        requesterPhoto: data.photo_url,
      })
    }
  }

  // Vérifier les demandes en attente au chargement
  useEffect(() => {
    let cancelled = false
    async function checkPending() {
      const { data } = await supabase
        .from('friendships')
        .select('id, requester_id')
        .eq('addressee_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled && data) {
        await resolveRequest(data.id, data.requester_id)
      }
    }
    checkPending()
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime : nouvelle demande reçue
  useEffect(() => {
    const ch = supabase
      .channel(`friend-req-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${userId}` },
        async ({ new: row }) => {
          if (row.status !== 'pending') return
          await resolveRequest(row.id, row.requester_id)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function accept() {
    if (!request || loading) return
    setLoading('accept')
    try {
      const res = await fetch(`/api/friends/${request.friendshipId}/accept`, { method: 'POST' })
      if (!res.ok) { toast.error('Erreur'); setRequest(null); return }
      toast.success(`${request.requesterPseudo} est maintenant ton ami ! 🎉`)
      setRequest(null)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(null)
    }
  }

  async function decline() {
    if (!request || loading) return
    setLoading('decline')
    try {
      await fetch(`/api/friends/${request.friendshipId}/decline`, { method: 'POST' })
      setRequest(null)
    } catch { /* ignore */ }
    finally { setLoading(null) }
  }

  return (
    <AnimatePresence>
      {request && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={decline}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-sm rounded-3xl p-6 pointer-events-auto border border-[#00D4FF]/20"
              style={{
                background: 'var(--bg-elevated, #0d1f35)',
                boxShadow: '0 0 80px rgba(0,212,255,0.15), 0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              {/* Glow icon */}
              <div className="relative mx-auto mb-5 w-20 h-20">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-[#00D4FF]/30"
                    animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
                    transition={{ duration: 1.8, delay: i * 0.55, repeat: Infinity }}
                  />
                ))}
                <div className="absolute inset-0 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center overflow-hidden">
                  {request.requesterPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={request.requesterPhoto} alt={request.requesterPseudo} className="w-full h-full object-cover" />
                  ) : (
                    <UserPlus size={32} className="text-[#00D4FF]" />
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-1">Demande d&apos;ami</p>
              <h2
                className="text-center text-3xl font-black text-white mb-1"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {NATION_FLAGS[request.requesterNation] ?? '🌍'} {request.requesterPseudo}
              </h2>
              <p className="text-center text-gray-400 text-sm mb-6">
                veut être ton ami
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
                  className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-xl bg-[#00D4FF] text-black font-black disabled:opacity-40 hover:brightness-105 transition-all"
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
