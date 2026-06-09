'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User as UserIcon, Bell, BellOff, LogOut, ChevronRight,
  Check, Shield, Smartphone, AlertTriangle, X,
  Trophy, Layers, Swords, Flame, Globe, Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { User } from '@/types'
import { NATIONS_2026 } from '@/types'

interface Props {
  user: User
  cardCount: number
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1 mb-2">{title}</h2>
      <div className="rounded-2xl overflow-hidden border border-white/5 bg-[#0D0D17]">
        {children}
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  onClick,
  danger = false,
  children,
}: {
  icon: React.ElementType
  label: string
  value?: string
  onClick?: () => void
  danger?: boolean
  children?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !children}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 transition-colors ${
        onClick ? 'hover:bg-white/5 active:bg-white/10' : 'cursor-default'
      } ${danger ? 'text-red-400' : 'text-white'}`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        danger ? 'bg-red-500/10' : 'bg-white/5'
      }`}>
        <Icon size={16} className={danger ? 'text-red-400' : 'text-gray-400'} />
      </div>
      <span className="flex-1 text-left text-sm font-semibold">{label}</span>
      {value && <span className="text-gray-500 text-sm">{value}</span>}
      {onClick && <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />}
      {children}
    </button>
  )
}

export function SettingsClient({ user, cardCount }: Props) {
  const router = useRouter()
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>('default')
  const [mounted, setMounted] = useState(false)
  const [showEditPseudo, setShowEditPseudo] = useState(false)
  const [showEditNation, setShowEditNation] = useState(false)
  const [showBlockedGuide, setShowBlockedGuide] = useState(false)
  const [pseudo, setPseudo] = useState(user.pseudo)
  const [nation, setNation] = useState(user.nation)
  const [saving, setSaving] = useState(false)
  const [nationSearch, setNationSearch] = useState('')
  const pseudoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    if ('Notification' in window) setNotifStatus(Notification.permission)
  }, [])

  const currentNation = NATIONS_2026.find((n) => n.name === nation)
  const filteredNations = NATIONS_2026.filter((n) =>
    n.name.toLowerCase().includes(nationSearch.toLowerCase())
  )

  const savePseudo = async () => {
    if (pseudo === user.pseudo) { setShowEditPseudo(false); return }
    setSaving(true)
    const res = await fetch('/api/settings/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Pseudo mis à jour !')
    setShowEditPseudo(false)
    router.refresh()
  }

  const saveNation = async (newNation: string) => {
    setNation(newNation)
    setShowEditNation(false)
    setNationSearch('')
    if (newNation === user.nation) return
    const res = await fetch('/api/settings/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nation: newNation }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Nation mise à jour !')
    router.refresh()
  }

  const toggleNotifications = async () => {
    if (!mounted || !('Notification' in window)) return
    if (notifStatus === 'denied') { setShowBlockedGuide(true); return }

    if (notifStatus === 'granted') {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setNotifStatus('default')
      toast('Notifications désactivées', { icon: '🔕' })
      return
    }

    const permission = await Notification.requestPermission()
    setNotifStatus(permission)
    if (permission === 'denied') { setShowBlockedGuide(true); return }
    if (permission !== 'granted') return

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      toast.success('Notifications activées ! ⚽')
    } catch {
      toast.error("Erreur lors de l'activation")
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const notifLabel = !mounted
    ? 'Chargement…'
    : notifStatus === 'granted'
    ? 'Activées'
    : notifStatus === 'denied'
    ? 'Bloquées par le navigateur'
    : 'Désactivées'

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg mx-auto">
      {/* Header */}
      <h1
        className="text-4xl font-black text-white mb-1"
        style={{ fontFamily: 'Bebas Neue, sans-serif' }}
      >
        PARAMÈTRES
      </h1>
      <p className="text-gray-500 text-sm mb-8">Gère ton compte WorldSquad</p>

      {/* Avatar + stats */}
      <div className="rounded-2xl p-5 mb-6 border border-white/5 bg-[#0D0D17]">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5C518] to-[#00D4FF] flex items-center justify-center text-black font-black text-2xl overflow-hidden flex-shrink-0">
            {user.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo_url} alt={user.pseudo} className="w-full h-full object-cover" />
            ) : (
              user.pseudo.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-white font-black text-xl">{user.pseudo}</p>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[#F5C518] text-xs font-bold">{user.coins.toLocaleString('fr-FR')} coins</span>
              {user.is_vip && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#F5C518]/20 text-[#F5C518]">VIP</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Layers, label: 'Cartes', value: cardCount },
            { icon: Trophy, label: 'Pronostics', value: user.predictions_correct },
            { icon: Swords, label: 'Battles', value: user.battles_won },
            { icon: Flame, label: 'Série', value: user.daily_streak },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/5">
              <Icon size={14} className="text-[#F5C518]" />
              <span className="text-white font-black text-base leading-none">{value}</span>
              <span className="text-gray-500 text-[10px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Profil */}
      <Section title="Profil">
        <Row
          icon={UserIcon}
          label="Pseudo"
          value={user.pseudo}
          onClick={() => { setShowEditPseudo(true); setTimeout(() => pseudoRef.current?.focus(), 50) }}
        />
        <Row
          icon={Globe}
          label="Nation"
          value={`${currentNation?.flag ?? ''} ${nation}`}
          onClick={() => setShowEditNation(true)}
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row
          icon={notifStatus === 'granted' ? Bell : BellOff}
          label="Notifications push"
          value={notifLabel}
          onClick={mounted ? toggleNotifications : undefined}
        />
        {notifStatus === 'granted' && (
          <Row
            icon={Send}
            label="Envoyer une notification test"
            onClick={async () => {
              const res = await fetch('/api/push/test', { method: 'POST' })
              if (res.ok) toast.success('Notification envoyée ! Vérifie tes alertes 🔔')
              else toast.error('Erreur — abonne-toi d\'abord aux notifications')
            }}
          />
        )}
      </Section>

      {/* Compte */}
      <Section title="Compte">
        <Row icon={Shield} label="Membre depuis" value={new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} />
        <Row icon={LogOut} label="Se déconnecter" onClick={handleSignOut} danger />
      </Section>

      {/* App */}
      <Section title="Application">
        <Row icon={Smartphone} label="Niveau" value={user.level} />
        <Row icon={Globe} label="Version" value="WorldSquad 1.0" />
      </Section>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {/* Edit pseudo */}
        {showEditPseudo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowEditPseudo(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-5 border border-white/10 bg-[#13131f]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black text-lg">Modifier le pseudo</h3>
                <button onClick={() => setShowEditPseudo(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-gray-400"><X size={14} /></button>
              </div>
              <input
                ref={pseudoRef}
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && savePseudo()}
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-[#F5C518]/50 mb-1"
                placeholder="Ton pseudo"
              />
              <p className="text-gray-600 text-xs mb-4">{pseudo.length}/20 · lettres, chiffres, _ - .</p>
              <div className="flex gap-2">
                <button onClick={() => setShowEditPseudo(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 text-gray-400">Annuler</button>
                <button
                  onClick={savePseudo}
                  disabled={saving || pseudo.length < 3}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black bg-[#F5C518] text-black disabled:opacity-40"
                >
                  {saving ? '…' : <><Check size={14} /> Sauvegarder</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Edit nation */}
        {showEditNation && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowEditNation(false); setNationSearch('') }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0D0D17] overflow-hidden"
              style={{ maxHeight: '80dvh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/5">
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
                <h3 className="text-white font-black text-lg mb-3">Choisir ta nation</h3>
                <input
                  value={nationSearch}
                  onChange={(e) => setNationSearch(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#F5C518]/50 placeholder-gray-600"
                  placeholder="Rechercher…"
                />
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(80dvh - 140px)' }}>
                {filteredNations.map((n) => (
                  <button
                    key={n.name}
                    onClick={() => saveNation(n.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 text-left transition-colors hover:bg-white/5 active:bg-white/10 ${n.name === nation ? 'bg-[#F5C518]/5' : ''}`}
                  >
                    <span className="text-2xl">{n.flag}</span>
                    <span className="flex-1 text-sm font-semibold text-white">{n.name}</span>
                    <span className="text-xs text-gray-600">{n.confederation}</span>
                    {n.name === nation && <Check size={14} className="text-[#F5C518]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Notifications bloquées */}
        {showBlockedGuide && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowBlockedGuide(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-5 border border-orange-500/20 bg-[#1a1208]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-black">Notifications bloquées</h3>
                  <p className="text-orange-400 text-xs">Débloque-les dans les paramètres</p>
                </div>
                <button onClick={() => setShowBlockedGuide(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-gray-400"><X size={14} /></button>
              </div>
              <div className="space-y-2.5 mb-5">
                {[
                  '🔒 Clique sur le cadenas dans la barre d\'adresse',
                  '⚙️ Va dans "Paramètres du site"',
                  '🔔 Mets "Notifications" sur Autoriser',
                  '🔄 Recharge la page et réessaie',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-gray-300 text-sm">{step}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowBlockedGuide(false); location.reload() }}
                className="w-full py-3 rounded-xl text-sm font-black bg-orange-500 text-white hover:bg-orange-400 active:scale-95 transition-all"
              >
                J'ai modifié — Recharger
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
