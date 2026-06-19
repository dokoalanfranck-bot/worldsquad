'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag, Star, Zap, Crown, X, Upload, Phone,
  CheckCircle2, Clock, XCircle, ChevronRight, Smartphone,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface ShopConfig {
  orange_money: string
  mtn: string
  d17: string
  prices_fcfa: Record<string, number>
  prices_dt: Record<string, number>
  is_active: boolean
}

interface PaymentRequest {
  id: string
  pack_name: string
  amount_fcfa: number
  coins_to_credit: number
  payment_method: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
}

const PACKS = [
  {
    key: 'starter',
    name: 'Pack Starter',
    coins: 1000,
    color: '#9CA3AF',
    icon: Star,
    badge: null,
    desc: '1 000 SquadCoins',
  },
  {
    key: 'fan',
    name: 'Pack Fan',
    coins: 3000,
    color: '#00D4FF',
    icon: Zap,
    badge: 'POPULAIRE',
    desc: '3 000 SquadCoins',
  },
  {
    key: 'ultra',
    name: 'Pack Ultra',
    coins: 8000,
    color: '#F5C518',
    icon: Crown,
    badge: 'MEILLEUR PRIX',
    desc: '8 000 SquadCoins',
  },
]

function fcfa(n: number) { return n.toLocaleString('fr-FR') + ' FCFA' }
function dt(n: number)   { return n.toLocaleString('fr-FR') + ' DT' }
function formatAmount(n: number, method: string) {
  return method === 'd17' ? dt(n) : fcfa(n)
}

export default function ShopPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<ShopConfig | null>(null)
  const [myRequests, setMyRequests] = useState<PaymentRequest[]>([])
  const [payRegion, setPayRegion] = useState<'cameroun' | 'tunisie'>('cameroun')
  const isTunisian = payRegion === 'tunisie'
  const hasPending = myRequests.some((r) => r.status === 'pending')
  const [selected, setSelected] = useState<typeof PACKS[0] | null>(null)
  const [step, setStep] = useState<'method' | 'form'>('method')
  const [payMethod, setPayMethod] = useState<'orange_money' | 'mtn' | 'd17'>('orange_money')
  const [phone, setPhone] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/shop/config', { cache: 'no-store' }).then((r) => r.json()).then(setConfig).catch(() => {})

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: reqs } = await supabase
        .from('payment_requests')
        .select('id, pack_name, amount_fcfa, coins_to_credit, payment_method, status, admin_note, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setMyRequests((reqs ?? []) as PaymentRequest[])
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset payment method when switching region
  useEffect(() => {
    setPayMethod(isTunisian ? 'd17' : 'orange_money')
  }, [isTunisian])

  function openModal(pack: typeof PACKS[0]) {
    setSelected(pack)
    setStep('method')
    setPhone('')
    setFile(null)
    setPreview(null)
  }

  function closeModal() {
    setSelected(null)
    setFile(null)
    setPreview(null)
  }

  function handleFile(f: File) {
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  async function submitRequest() {
    if (!selected || !config) return
    if (!phone.trim()) { toast.error('Entre ton numéro de téléphone'); return }
    if (!file) { toast.error('Uploade la capture d\'écran du dépôt'); return }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('pack_type', selected.key)
      fd.append('phone_number', phone.trim())
      fd.append('payment_method', payMethod)
      fd.append('screenshot', file)

      const res = await fetch('/api/shop/payment-request', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }

      toast.success('Demande envoyée ! L\'admin validera ton paiement.')
      closeModal()
      // Refresh requests list
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: reqs } = await supabase
          .from('payment_requests')
          .select('id, pack_name, amount_fcfa, coins_to_credit, payment_method, status, admin_note, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        setMyRequests((reqs ?? []) as PaymentRequest[])
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const number = payMethod === 'orange_money' ? config?.orange_money : payMethod === 'd17' ? config?.d17 : config?.mtn
  const price = selected && config
    ? (isTunisian ? (config.prices_dt?.[selected.key] ?? 0) : (config.prices_fcfa[selected.key] ?? 0))
    : 0
  const priceLabel = isTunisian ? dt(price) : fcfa(price)

  return (
    <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto pb-28">
      {/* Header */}
      <div className="mb-8">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">WorldSquad</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
            <ShoppingBag size={22} className="text-orange-400" />
          </div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>BOUTIQUE</h1>
        </div>

        {/* Region toggle */}
        <div className="mt-4 inline-flex items-center glass rounded-2xl p-1 border border-white/10">
          <button
            onClick={() => setPayRegion('cameroun')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${payRegion === 'cameroun' ? 'bg-orange-500/20 text-orange-300' : 'text-white/30 hover:text-white/60'}`}
          >
            🇨🇲 Cameroun
          </button>
          <button
            onClick={() => setPayRegion('tunisie')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${payRegion === 'tunisie' ? 'bg-blue-500/20 text-blue-300' : 'text-white/30 hover:text-white/60'}`}
          >
            🇹🇳 Tunisie
          </button>
        </div>
      </div>

      {/* Bandeau demande en attente */}
      {hasPending && (
        <div className="glass rounded-2xl p-4 mb-6 border border-amber-500/30 flex items-start gap-3">
          <Clock size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-bold text-sm">Demande en cours de traitement</p>
            <p className="text-white/40 text-xs mt-0.5">Tu as déjà une demande en attente. Tu pourras en soumettre une nouvelle une fois qu'elle sera traitée par l'admin.</p>
          </div>
        </div>
      )}

      {/* Pack cards */}
      <div className="space-y-3 mb-8">
        {PACKS.map((pack) => {
          const Icon = pack.icon
          const packPrice = config
            ? (isTunisian ? config.prices_dt?.[pack.key] : config.prices_fcfa[pack.key])
            : undefined
          const blocked = hasPending || !config?.is_active
          return (
            <motion.div key={pack.key} whileTap={!blocked ? { scale: 0.98 } : undefined}
              onClick={() => !blocked && openModal(pack)}
              className={`relative glass rounded-2xl p-5 border flex items-center gap-4 transition-all
                ${pack.key === 'fan' ? 'border-[#00D4FF]/30' : pack.key === 'ultra' ? 'border-[#F5C518]/30' : 'border-white/5'}
                ${blocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-white/20'}`}
            >
              {pack.badge && (
                <div className="absolute -top-2.5 left-5 text-[9px] font-black px-2.5 py-0.5 rounded-full text-black"
                  style={{ background: pack.color }}>{pack.badge}</div>
              )}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${pack.color}18` }}>
                <Icon size={24} style={{ color: pack.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-base" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{pack.name}</p>
                <p className="text-white/40 text-sm">{pack.desc}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {packPrice !== undefined ? (
                  <p className="font-black text-lg" style={{ color: pack.color, fontFamily: 'Bebas Neue, sans-serif' }}>
                    {isTunisian ? dt(packPrice) : fcfa(packPrice)}
                  </p>
                ) : (
                  <div className="w-20 h-5 bg-white/5 rounded animate-pulse" />
                )}
                <ChevronRight size={14} className="text-white/20 ml-auto mt-0.5" />
              </div>
            </motion.div>
          )
        })}
      </div>

      {!config?.is_active && (
        <div className="glass rounded-xl p-4 border border-orange-500/20 text-orange-400 text-sm text-center mb-6">
          🔧 Boutique temporairement fermée. Reviens bientôt !
        </div>
      )}

      {/* Mes demandes */}
      {myRequests.length > 0 && (
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Mes demandes de paiement</p>
          <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
            {myRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                  ${r.status === 'approved' ? 'bg-green-500/10' : r.status === 'rejected' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                  {r.status === 'approved'
                    ? <CheckCircle2 size={15} className="text-green-400" />
                    : r.status === 'rejected'
                      ? <XCircle size={15} className="text-red-400" />
                      : <Clock size={15} className="text-amber-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{r.pack_name}</p>
                  <p className="text-white/30 text-xs">
                    {formatAmount(r.amount_fcfa, r.payment_method)} · {r.payment_method === 'orange_money' ? 'Orange Money' : r.payment_method === 'd17' ? 'D17' : 'MTN'}
                    {r.admin_note && <span className="text-red-400 ml-1">· {r.admin_note}</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-bold uppercase
                    ${r.status === 'approved' ? 'text-green-400' : r.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>
                    {r.status === 'approved' ? 'Approuvé' : r.status === 'rejected' ? 'Rejeté' : 'En attente'}
                  </span>
                  {r.status === 'approved' && (
                    <p className="text-[#F5C518] text-xs font-bold">+{r.coins_to_credit.toLocaleString()} 🪙</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => e.target === e.currentTarget && closeModal()}>

            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-md glass rounded-3xl p-6 border border-white/10"
            >
              {/* Header modal */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    {selected.name}
                  </h2>
                  <p className="text-white/40 text-sm">{selected.coins.toLocaleString()} SquadCoins</p>
                </div>
                <button onClick={closeModal}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {step === 'method' && (
                <>
                  {/* Choix méthode */}
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Choisis ton opérateur</p>

                  {isTunisian ? (
                    /* D17 only for Tunisian users */
                    <div className="mb-5">
                      <button onClick={() => setPayMethod('d17')}
                        disabled={!config?.d17}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed
                          ${payMethod === 'd17' ? 'border-blue-400/50 bg-blue-500/5' : 'border-white/10 hover:border-white/20'}`}>
                        <Smartphone size={20} className="text-blue-400 mb-2" />
                        <p className="text-white font-bold text-sm leading-tight">D17 🇹🇳</p>
                        {config?.d17
                          ? <p className="font-mono text-xs mt-1 text-blue-400">{config.d17}</p>
                          : <p className="text-white/30 text-xs mt-1">Non configuré</p>
                        }
                      </button>
                    </div>
                  ) : (
                    /* Orange Money + MTN for others */
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {[
                        { key: 'orange_money' as const, label: 'Orange Money', color: '#FF6B00', num: config?.orange_money },
                        { key: 'mtn' as const, label: 'MTN Mobile Money', color: '#FFC800', num: config?.mtn },
                      ].map((m) => (
                        <button key={m.key} onClick={() => setPayMethod(m.key)}
                          disabled={!m.num}
                          className={`p-4 rounded-2xl border-2 text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed
                            ${payMethod === m.key ? 'border-white/30 bg-white/5' : 'border-white/10 hover:border-white/20'}`}>
                          <Smartphone size={20} style={{ color: m.color }} className="mb-2" />
                          <p className="text-white font-bold text-sm leading-tight">{m.label}</p>
                          {m.num
                            ? <p className="font-mono text-xs mt-1" style={{ color: m.color }}>{m.num}</p>
                            : <p className="text-white/30 text-xs mt-1">Non configuré</p>
                          }
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Instruction */}
                  {number && (
                    <div className="glass rounded-2xl p-4 mb-5 border border-white/10">
                      <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Instructions</p>
                      <ol className="space-y-2 text-sm text-white/70">
                        <li className="flex gap-2"><span className="text-[#F5C518] font-bold">1.</span>
                          Envoie <span className="text-[#F5C518] font-black">{priceLabel}</span> au numéro :
                        </li>
                        <li className="bg-white/5 rounded-xl px-4 py-2 font-mono text-white font-bold text-center text-base tracking-widest">
                          {number}
                        </li>
                        <li className="flex gap-2"><span className="text-[#F5C518] font-bold">2.</span>
                          Note le message de confirmation</li>
                        <li className="flex gap-2"><span className="text-[#F5C518] font-bold">3.</span>
                          Prends une capture d'écran et reviens ici</li>
                      </ol>
                    </div>
                  )}

                  <button
                    onClick={() => setStep('form')}
                    disabled={!number}
                    className="w-full bg-[#F5C518] disabled:opacity-30 text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    J'AI FAIT LE DÉPÔT ✓
                  </button>
                </>
              )}

              {step === 'form' && (
                <>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-4">Confirme ton dépôt</p>

                  {/* Phone */}
                  <div className="mb-4">
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-1.5 block">
                      Ton numéro de téléphone
                    </label>
                    <div className="flex items-center gap-2 glass rounded-xl px-4 py-3 border border-white/10 focus-within:border-[#F5C518]/40">
                      <Phone size={14} className="text-gray-500 flex-shrink-0" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="6XX XXX XXX"
                        className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                      />
                    </div>
                  </div>

                  {/* Screenshot upload */}
                  <div className="mb-5">
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-1.5 block">
                      Capture d'écran du dépôt
                    </label>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

                    {preview ? (
                      <div className="relative rounded-xl overflow-hidden border border-white/10 cursor-pointer"
                        onClick={() => fileRef.current?.click()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="preview" className="w-full max-h-48 object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs font-bold">Changer</p>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-white/15 rounded-xl py-8 flex flex-col items-center gap-2 text-white/30 hover:border-white/30 hover:text-white/50 transition-all">
                        <Upload size={24} />
                        <span className="text-sm">Appuie pour choisir une image</span>
                        <span className="text-xs">JPG, PNG — max 5 Mo</span>
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setStep('method')}
                      className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/50 font-bold text-sm hover:border-white/20">
                      Retour
                    </button>
                    <button onClick={submitRequest} disabled={loading || !phone.trim() || !file}
                      className="flex-1 bg-[#F5C518] disabled:opacity-30 text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2"
                      style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> ENVOI…</>
                        : 'ENVOYER MA DEMANDE'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
