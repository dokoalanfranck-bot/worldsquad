'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface PendingAlert {
  id: string
  pseudo: string
  pack_name: string
  amount_fcfa: number
  payment_method: 'orange_money' | 'mtn'
}

function fcfa(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

export function PaymentNotifier() {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<PendingAlert[]>([])
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // Initial pending count
    supabase
      .from('payment_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0))

    const channel = supabase
      .channel('payment-notifier')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payment_requests' },
        async (payload) => {
          const pr = payload.new as { id: string; user_id: string; pack_name: string; amount_fcfa: number; payment_method: string }
          const { data: user } = await supabase
            .from('users')
            .select('pseudo')
            .eq('id', pr.user_id)
            .single()

          const alert: PendingAlert = {
            id: pr.id,
            pseudo: user?.pseudo ?? 'Joueur',
            pack_name: pr.pack_name,
            amount_fcfa: pr.amount_fcfa,
            payment_method: pr.payment_method as 'orange_money' | 'mtn',
          }
          setAlerts((prev) => [...prev, alert])
          setPendingCount((c) => c + 1)
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== pr.id))
          }, 8000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payment_requests' },
        (payload) => {
          const pr = payload.new as { status: string }
          if (pr.status !== 'pending') {
            setPendingCount((c) => Math.max(0, c - 1))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  return (
    <>
      {/* Badge sur l'icône sidebar — affiché via data attribute */}
      {pendingCount > 0 && (
        <div
          id="payment-pending-count"
          className="hidden"
          data-count={pendingCount}
        />
      )}

      {/* Popups en bas à droite */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 120, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="pointer-events-auto"
            >
              <div className="glass rounded-2xl p-4 border border-orange-500/30 shadow-2xl max-w-sm w-full">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={18} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm leading-tight">💳 Nouveau paiement</p>
                    <p className="text-white/60 text-xs mt-0.5">
                      <span className="text-white font-bold">{alert.pseudo}</span> a soumis un dépôt pour{' '}
                      <span className="text-orange-400 font-bold">{alert.pack_name}</span>
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {fcfa(alert.amount_fcfa)} · {alert.payment_method === 'orange_money' ? 'Orange Money' : 'MTN'}
                    </p>
                    <Link href="/admin/shop" className="inline-block mt-2 text-xs text-orange-400 font-bold hover:text-orange-300 underline">
                      Vérifier →
                    </Link>
                  </div>
                  <button
                    onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                    className="p-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
