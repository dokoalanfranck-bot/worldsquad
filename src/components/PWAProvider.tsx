'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Download } from 'lucide-react'
import toast from 'react-hot-toast'


export function PWAProvider() {
  const [mounted, setMounted] = useState(false)
  const [swReady, setSwReady] = useState(false)
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>('default')
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [supportsNotifications, setSupportsNotifications] = useState(false)

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      setSwReady(true)
      console.log('[PWA] Service worker registered')

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Mise à jour disponible — rechargez la page', {
              icon: '🔄',
              duration: 8000,
            })
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
  }, [])

  // Capture install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Detect already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const subscribeToPush = async () => {
    if (!swReady || !('PushManager' in window)) {
      toast.error('Les notifications push ne sont pas supportées')
      return
    }

    const permission = await Notification.requestPermission()
    setNotifStatus(permission)

    if (permission !== 'granted') {
      toast.error('Permission refusée')
      return
    }

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

  const handleInstall = async () => {
    if (!installPrompt) return
    const prompt = installPrompt as BeforeInstallPromptEvent
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
  }

  if (!mounted) return null
  if (!supportsNotifications && !installPrompt) return null

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2 sm:bottom-6" style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 4px) + 72px)' }}>
      {/* Install button */}
      {installPrompt && !isInstalled && (
        <button
          onClick={handleInstall}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/20 hover:brightness-110 active:scale-95 transition-all"
          title="Installer WorldSquad"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Installer</span>
        </button>
      )}

      {/* Notification toggle */}
      {supportsNotifications && (
        <button
          onClick={notifStatus === 'granted' ? unsubscribeFromPush : subscribeToPush}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all ${
            notifStatus === 'granted'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-white/10 text-white/60 border border-white/10 hover:bg-white/20'
          }`}
          title={notifStatus === 'granted' ? 'Désactiver les notifications' : 'Activer les notifications'}
        >
          {notifStatus === 'granted' ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {notifStatus === 'granted' ? 'Notif ON' : 'Activer notifs'}
          </span>
        </button>
      )}
    </div>
  )
}

// Type augmentation for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
