'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, CheckCircle2, XCircle, Clock, Settings,
  Save, Eye, ChevronDown, ChevronUp, Phone, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface ShopConfig {
  id: string
  orange_money: string
  mtn: string
  prices_fcfa: Record<string, number>
  is_active: boolean
}

interface PaymentRequest {
  id: string
  user_id: string
  pack_type: string
  pack_name: string
  amount_fcfa: number
  coins_to_credit: number
  phone_number: string
  screenshot_url: string
  payment_method: 'orange_money' | 'mtn'
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  reviewed_at: string | null
  users?: { pseudo: string; photo_url: string | null }
}

function fcfa(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'à l\'instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

export default function AdminShopPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<ShopConfig | null>(null)
  const [pendingRequests, setPendingRequests] = useState<PaymentRequest[]>([])
  const [historyRequests, setHistoryRequests] = useState<PaymentRequest[]>([])
  const [tab, setTab] = useState<'pending' | 'history' | 'config'>('pending')
  const [configDraft, setConfigDraft] = useState<Partial<ShopConfig>>({})
  const [savingConfig, setSavingConfig] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const cfgRes = await fetch('/api/shop/config', { cache: 'no-store' })
    const cfg = await cfgRes.json() as ShopConfig
    setConfig(cfg)
    setConfigDraft({
      orange_money: cfg.orange_money,
      mtn: cfg.mtn,
      prices_fcfa: { ...cfg.prices_fcfa },
      is_active: cfg.is_active,
    })

    const { data: pending } = await supabase
      .from('payment_requests')
      .select('*, users(pseudo, photo_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setPendingRequests((pending ?? []) as PaymentRequest[])

    const { data: history } = await supabase
      .from('payment_requests')
      .select('*, users(pseudo, photo_url)')
      .neq('status', 'pending')
      .order('reviewed_at', { ascending: false })
      .limit(50)
    setHistoryRequests((history ?? []) as PaymentRequest[])
  }, [supabase])

  useEffect(() => {
    loadData()

    // Realtime pour nouvelles demandes
    const channel = supabase
      .channel('admin-payments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payment_requests' }, () => {
        loadData()
        toast('💳 Nouvelle demande de paiement !', { icon: '🔔' })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payment_requests' }, () => {
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadData, supabase])

  async function saveConfig() {
    setSavingConfig(true)
    try {
      const res = await fetch('/api/admin/shop-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configDraft),
      })
      if (res.ok) { toast.success('Configuration sauvegardée'); await loadData() }
      else toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSavingConfig(false)
    }
  }

  async function approve(id: string) {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/admin/payment-requests/${id}/approve`, { method: 'POST' })
      if (res.ok) { toast.success('Paiement approuvé ✅'); await loadData() }
      else { const d = await res.json(); toast.error(d.error ?? 'Erreur') }
    } finally {
      setProcessingId(null)
    }
  }

  async function reject(id: string) {
    setProcessingId(id)
    try {
      const res = await fetch(`/api/admin/payment-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote.trim() || undefined }),
      })
      if (res.ok) {
        toast.success('Paiement rejeté')
        setRejectingId(null)
        setRejectNote('')
        await loadData()
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Erreur')
      }
    } finally {
      setProcessingId(null)
    }
  }

  const TABS = [
    { key: 'pending', label: `En attente ${pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}` },
    { key: 'history', label: 'Historique' },
    { key: 'config', label: 'Configuration' },
  ] as const

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <CreditCard size={22} className="text-orange-400" />
        </div>
        <div>
          <h1 className="font-bebas text-3xl text-white">PAIEMENTS BOUTIQUE</h1>
          <p className="text-white/40 text-sm">Orange Money & MTN Mobile Money</p>
        </div>
        {config && (
          <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold border
            ${config.is_active ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {config.is_active ? '● Boutique ouverte' : '● Boutique fermée'}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-xl p-1 mb-6 border border-white/5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all
              ${tab === t.key ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Pending requests */}
      {tab === 'pending' && (
        <div>
          {pendingRequests.length === 0 ? (
            <div className="glass rounded-2xl p-12 border border-white/5 text-center">
              <Clock size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/30">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((r) => (
                <motion.div key={r.id} layout
                  className="glass rounded-2xl border border-amber-500/20 overflow-hidden">
                  {/* Card header */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Clock size={18} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-sm">{r.users?.pseudo ?? r.user_id.slice(0, 8)}</p>
                        <span className="text-white/20 text-xs">·</span>
                        <p className="text-white/50 text-xs">{timeAgo(r.created_at)}</p>
                      </div>
                      <p className="text-white/50 text-xs">{r.pack_name} — {fcfa(r.amount_fcfa)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold
                        ${r.payment_method === 'orange_money' ? 'bg-orange-500/10 text-orange-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {r.payment_method === 'orange_money' ? 'Orange' : 'MTN'}
                      </span>
                      <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        {expandedId === r.id ? <ChevronUp size={14} className="text-white/50" /> : <ChevronDown size={14} className="text-white/50" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  <AnimatePresence>
                    {expandedId === r.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-4">
                          {/* Info */}
                          <div className="bg-white/5 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone size={13} className="text-white/40" />
                              <span className="text-white/50 text-xs">Tél :</span>
                              <span className="text-white font-mono">{r.phone_number}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-white/50 text-xs">Coins à créditer :</span>
                              <span className="text-[#F5C518] font-bold">{r.coins_to_credit.toLocaleString()} 🪙</span>
                            </div>
                          </div>

                          {/* Screenshot */}
                          {r.screenshot_url && (
                            <div>
                              <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Capture d'écran</p>
                              <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer"
                                className="block relative rounded-xl overflow-hidden border border-white/10 group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={r.screenshot_url} alt="preuve" className="w-full max-h-64 object-contain bg-black" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                  <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </a>
                            </div>
                          )}

                          {/* Actions */}
                          {rejectingId === r.id ? (
                            <div className="space-y-2">
                              <input
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Raison du rejet (optionnel)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none placeholder-gray-600 focus:border-red-500/40"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => { setRejectingId(null); setRejectNote('') }}
                                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20">
                                  Annuler
                                </button>
                                <button onClick={() => reject(r.id)} disabled={processingId === r.id}
                                  className="flex-1 bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                  {processingId === r.id
                                    ? <><div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /></>
                                    : <><XCircle size={14} /> Confirmer rejet</>}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => setRejectingId(r.id)}
                                className="flex-1 py-3 rounded-xl border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/10 flex items-center justify-center gap-2 transition-all">
                                <XCircle size={14} /> Rejeter
                              </button>
                              <button onClick={() => approve(r.id)} disabled={processingId === r.id}
                                className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-green-500/30 transition-all">
                                {processingId === r.id
                                  ? <><div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" /></>
                                  : <><CheckCircle2 size={14} /> Approuver</>}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div>
          {historyRequests.length === 0 ? (
            <div className="glass rounded-2xl p-12 border border-white/5 text-center">
              <p className="text-white/30">Aucun historique</p>
            </div>
          ) : (
            <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
              {historyRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                    ${r.status === 'approved' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {r.status === 'approved'
                      ? <CheckCircle2 size={15} className="text-green-400" />
                      : <XCircle size={15} className="text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold">{r.users?.pseudo ?? r.user_id.slice(0, 8)}</p>
                    <p className="text-white/30 text-xs truncate">
                      {r.pack_name} · {fcfa(r.amount_fcfa)} · {r.payment_method === 'orange_money' ? 'Orange' : 'MTN'}
                      {r.admin_note && <span className="text-red-400"> · {r.admin_note}</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-bold ${r.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                      {r.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                    </span>
                    <p className="text-white/30 text-xs">{r.reviewed_at ? timeAgo(r.reviewed_at) : ''}</p>
                  </div>
                  {r.screenshot_url && (
                    <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ml-1">
                      <Eye size={13} className="text-white/40" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Config */}
      {tab === 'config' && config && (
        <div className="space-y-6">
          {/* Status */}
          <div className="glass rounded-2xl border border-white/5 p-5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <Settings size={12} /> Statut boutique
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold">Boutique active</p>
                <p className="text-white/30 text-sm">Les utilisateurs peuvent soumettre des paiements</p>
              </div>
              <button
                onClick={() => setConfigDraft((d) => ({ ...d, is_active: !d.is_active }))}
                className={`w-12 h-6 rounded-full transition-all relative
                  ${configDraft.is_active ? 'bg-green-500' : 'bg-white/10'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all
                  ${configDraft.is_active ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Numéros */}
          <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
            <p className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-2">
              <Phone size={12} /> Numéros de dépôt
            </p>
            <div>
              <label className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1.5 block">Orange Money</label>
              <input
                value={configDraft.orange_money ?? ''}
                onChange={(e) => setConfigDraft((d) => ({ ...d, orange_money: e.target.value }))}
                placeholder="6XX XXX XXX"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-gray-600 focus:border-orange-500/40 font-mono"
              />
            </div>
            <div>
              <label className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1.5 block">MTN Mobile Money</label>
              <input
                value={configDraft.mtn ?? ''}
                onChange={(e) => setConfigDraft((d) => ({ ...d, mtn: e.target.value }))}
                placeholder="6XX XXX XXX"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-gray-600 focus:border-yellow-500/40 font-mono"
              />
            </div>
          </div>

          {/* Prix FCFA */}
          <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
            <p className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={12} /> Prix en FCFA
            </p>
            {[
              { key: 'starter', label: 'Pack Starter', coins: 1000, color: '#9CA3AF' },
              { key: 'fan',     label: 'Pack Fan',     coins: 3000, color: '#00D4FF' },
              { key: 'ultra',   label: 'Pack Ultra',   coins: 8000, color: '#F5C518' },
            ].map((p) => (
              <div key={p.key} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: p.color }}>{p.label}</p>
                  <p className="text-white/30 text-xs">{p.coins.toLocaleString()} SquadCoins</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={configDraft.prices_fcfa?.[p.key] ?? 0}
                    onChange={(e) => setConfigDraft((d) => ({
                      ...d,
                      prices_fcfa: { ...(d.prices_fcfa ?? {}), [p.key]: parseInt(e.target.value) || 0 },
                    }))}
                    className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-white/30 text-right"
                  />
                  <span className="text-white/30 text-sm">FCFA</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={saveConfig} disabled={savingConfig}
            className="w-full bg-[#F5C518] disabled:opacity-50 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {savingConfig
              ? <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> SAUVEGARDE…</>
              : <><Save size={16} /> SAUVEGARDER LA CONFIGURATION</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
