'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, X, Download, Smartphone, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

// Type augmentation for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

export function PWAProvider() {
  const [mounted, setMounted] = useState(false)
  const [swReady, setSwReady] = useState(false)
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>('default')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [supportsNotifications, setSupportsNotifications] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [showBlockedGuide, setShowBlockedGuide] = useState(false)

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      setSwReady(true)
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Mise à jour disponible — rechargez la page', { icon: '🔄', duration: 8000 })
          }
        })
      })
    }).catch((err) => console.warn('[PWA] SW registration failed', err))
  }, [])

  // Mount guard + notification permission
  useEffect(() => {
    setMounted(true)
    if ('Notification' in window) {
      setSupportsNotifications(true)
      setNotifStatus(Notification.permission)
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }
  }, [])

  // Capture install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      const prompt = e as BeforeInstallPromptEvent
      setInstallPrompt(prompt)
      // Show banner after 3s if user hasn't dismissed before
      if (!sessionStorage.getItem(DISMISSED_KEY)) {
        setTimeout(() => setShowBanner(true), 3000)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setShowBanner(false)
      setInstallPrompt(null)
      toast.success('WorldSquad installé ! 🎉', { duration: 4000 })
    }
  }

  const dismissBanner = () => {
    setShowBanner(false)
    sessionStorage.setItem(DISMISSED_KEY, '1')
  }

  const subscribeToPush = async () => {
    if (!swReady || !('PushManager' in window)) {
      toast.error('Les notifications push ne sont pas supportées sur ce navigateur')
      return
    }
    // Already blocked — show the unblock guide
    if (Notification.permission === 'denied') {
      setShowBlockedGuide(true)
      return
    }
    const permission = await Notification.requestPermission()
    setNotifStatus(permission)
    if (permission === 'denied') {
      setShowBlockedGuide(true)
      return
    }
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
      toast.success('Notifications activées ! ⚽', { duration: 3000 })
    } catch (err) {
      console.error('[PWA] Push subscribe error', err)
      toast.error("Erreur lors de l'activation des notifications")
    }
  }

  const unsubscribeFromPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
      setNotifStatus('default')
      toast('Notifications désactivées', { icon: '🔕' })
    } catch (err) {
      console.error('[PWA] Unsubscribe error', err)
    }
  }

  if (!mounted) return null

  return (
    <>
      {/* ── Notifications bloquées — guide de déblocage ───────────────── */}
      <AnimatePresence>
        {showBlockedGuide && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowBlockedGuide(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              className="w-full max-w-sm rounded-2xl p-5 border border-orange-500/20"
              style={{ background: 'linear-gradient(135deg, #1a1208 0%, #130f09 100%)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-white font-black text-base">Notifications bloquées</h3>
                  <p className="text-orange-400 text-xs">Débloque-les dans les paramètres</p>
                </div>
                <button onClick={() => setShowBlockedGuide(false)} className="ml-auto w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Ton navigateur a bloqué les notifications pour WorldSquad. Pour les réactiver :
              </p>

              <div className="space-y-2 mb-5">
                {[
                  { step: '1', text: 'Clique sur le 🔒 cadenas dans la barre d\'adresse' },
                  { step: '2', text: 'Va dans "Paramètres du site" ou "Autorisations"' },
                  { step: '3', text: 'Trouve "Notifications" et passe sur "Autoriser"' },
                  { step: '4', text: 'Recharge la page et réessaie' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-gray-300 text-sm">{text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setShowBlockedGuide(false); location.reload() }}
                className="w-full py-3 rounded-xl text-sm font-black bg-orange-500 text-white hover:bg-orange-400 active:scale-95 transition-all"
              >
                J'ai modifié — Recharger la page
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Install banner (bottom sheet) ─────────────────────────────── */}
      <AnimatePresence>
        {showBanner && installPrompt && !isInstalled && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            <div
              className="mx-auto max-w-lg rounded-2xl p-5 border border-white/10"
              style={{ background: 'linear-gradient(135deg, #13131f 0%, #0f0f1a 100%)' }}
            >
              {/* Close */}
              <button
                onClick={dismissBanner}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-[#F5C518] flex items-center justify-center flex-shrink-0 text-2xl">
                  ⚽
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-[10px] font-bold text-[#F5C518] uppercase tracking-widest mb-0.5">
                    Application disponible
                  </p>
                  <h3 className="text-white font-black text-lg leading-tight" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: 1 }}>
                    Installer WorldSquad
                  </h3>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    Accès rapide depuis ton écran d'accueil, fonctionne hors ligne et reçois les notifications de matchs.
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="flex gap-3 mt-4 mb-5">
                {[
                  { icon: '⚡', label: 'Accès rapide' },
                  { icon: '📶', label: 'Hors ligne' },
                  { icon: '🔔', label: 'Notifications' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-white/5">
                    <span className="text-base">{icon}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{label}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={dismissBanner}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-white/10 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  Plus tard
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black bg-[#F5C518] text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F5C518]/20"
                >
                  <Download className="w-4 h-4" />
                  Installer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating notification bell ─────────────────────────────────── */}
      {supportsNotifications && notifStatus !== 'denied' && (
        <div
          className="fixed right-4 z-40"
          style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 4px) + 76px)' }}
        >
          <button
            onClick={notifStatus === 'granted' ? unsubscribeFromPush : subscribeToPush}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all ${
              notifStatus === 'granted'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/10 text-white/60 border border-white/10 hover:bg-white/20'
            }`}
            title={notifStatus === 'granted' ? 'Désactiver les notifications' : 'Activer les notifications'}
          >
            {notifStatus === 'granted' ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {notifStatus === 'granted' ? 'Notifs ON' : 'Notifs'}
            </span>
          </button>
        </div>
      )}

      {/* ── Manual install button (if banner was dismissed) ────────────── */}
      {installPrompt && !isInstalled && !showBanner && (
        <div
          className="fixed right-4 z-40"
          style={{ bottom: supportsNotifications && notifStatus !== 'denied' ? 'calc(max(env(safe-area-inset-bottom), 4px) + 120px)' : 'calc(max(env(safe-area-inset-bottom), 4px) + 76px)' }}
        >
          <button
            onClick={() => setShowBanner(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/20 shadow-lg active:scale-95 transition-all hover:bg-[#F5C518]/20"
            title="Installer l'application"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Installer</span>
          </button>
        </div>
      )}
    </>
  )
}
