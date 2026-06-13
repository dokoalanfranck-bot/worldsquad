'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Globe, CheckCircle2, Zap, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Screen = 'install' | 'ios-guide' | 'ios-claim' | 'success'

const DISMISS_KEY = 'ws_install_dismissed_v1'
const REWARD_COINS = 500

export function InstallPrompt({ alreadyClaimed }: { alreadyClaimed: boolean }) {
  const [show, setShow] = useState(false)
  const [screen, setScreen] = useState<Screen>('install')
  const [claiming, setClaiming] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (alreadyClaimed || typeof window === 'undefined') return

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    const dismissed = !!localStorage.getItem(DISMISS_KEY)

    // iOS already installed → show claim screen immediately
    if (isIOS && isStandalone) {
      setScreen('ios-claim')
      setTimeout(() => setShow(true), 1500)
      return
    }

    if (dismissed) return

    if (!isIOS) {
      // Android / Desktop : capture beforeinstallprompt then show after 3 min
      const onPrompt = (e: Event) => {
        e.preventDefault()
        deferredPrompt.current = e as BeforeInstallPromptEvent
      }
      window.addEventListener('beforeinstallprompt', onPrompt)

      const timer = setTimeout(() => {
        if (deferredPrompt.current) {
          setScreen('install')
          setShow(true)
        }
      }, 3 * 60 * 1000)

      return () => {
        window.removeEventListener('beforeinstallprompt', onPrompt)
        clearTimeout(timer)
      }
    } else {
      // iOS not standalone → show guide after 3 min
      const timer = setTimeout(() => {
        setScreen('ios-guide')
        setShow(true)
      }, 3 * 60 * 1000)
      return () => clearTimeout(timer)
    }
  }, [alreadyClaimed])

  function dismiss() {
    setShow(false)
    if (screen !== 'ios-claim') {
      localStorage.setItem(DISMISS_KEY, '1')
    }
  }

  async function handleInstall() {
    if (!deferredPrompt.current) return
    deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    deferredPrompt.current = null
    if (outcome === 'accepted') {
      await claimReward()
    } else {
      dismiss()
    }
  }

  async function claimReward() {
    if (claiming) return
    setClaiming(true)
    try {
      const res = await fetch('/api/install-reward/claim', { method: 'POST' })
      const data = await res.json() as { coins?: number; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Erreur')
        setClaiming(false)
        return
      }
      setScreen('success')
      setTimeout(() => setShow(false), 4000)
    } catch {
      toast.error('Erreur réseau')
      setClaiming(false)
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={screen === 'ios-claim' ? undefined : dismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] max-w-lg mx-auto rounded-t-3xl overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            }}
          >
            {/* Red→gold stripe */}
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #C8102E, #F5C518)' }} />

            <AnimatePresence mode="wait">

              {/* ── Android / Desktop install screen ───────────────────── */}
              {screen === 'install' && (
                <motion.div key="install" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#F5C518]/15 flex items-center justify-center flex-shrink-0">
                        <Globe size={24} className="text-[#F5C518]" />
                      </div>
                      <div>
                        <p className="text-white font-black text-lg leading-tight" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                          INSTALLE WORLDSQUAD
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">Accès rapide · Alertes · Sans navigateur</p>
                      </div>
                    </div>
                    <button onClick={dismiss} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 flex-shrink-0 ml-3">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2.5 mb-5">
                    {[
                      'Alertes avant chaque match FIFA',
                      'Score en temps réel sans navigateur',
                      'Accès en 1 clic depuis ton écran',
                    ].map((b) => (
                      <div key={b} className="flex items-center gap-2.5">
                        <CheckCircle2 size={14} className="text-[#F5C518] flex-shrink-0" />
                        <span className="text-white/70 text-sm">{b}</span>
                      </div>
                    ))}
                  </div>

                  {/* Reward box */}
                  <div className="rounded-2xl p-4 mb-5 border border-[#F5C518]/25 flex items-center gap-3" style={{ background: 'rgba(245,197,24,0.06)' }}>
                    <div className="w-10 h-10 rounded-xl bg-[#F5C518]/20 flex items-center justify-center flex-shrink-0">
                      <Zap size={18} className="text-[#F5C518]" />
                    </div>
                    <div>
                      <p className="text-[#F5C518] font-black text-sm">BONUS D'INSTALLATION</p>
                      <p className="text-white/50 text-xs mt-0.5">+{REWARD_COINS} coins + 1 pack gratuit offerts</p>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleInstall}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-black text-lg mb-3"
                    style={{
                      fontFamily: 'Bebas Neue, sans-serif',
                      background: 'linear-gradient(135deg, #F5C518, #FFD700)',
                      boxShadow: '0 4px 24px rgba(245,197,24,0.35)',
                    }}
                  >
                    <Download size={20} />
                    INSTALLER L'APP
                  </motion.button>
                  <button onClick={dismiss} className="w-full py-2 text-white/25 text-sm hover:text-white/50 transition-colors">
                    Plus tard
                  </button>
                </motion.div>
              )}

              {/* ── iOS guide (not standalone) ──────────────────────────── */}
              {screen === 'ios-guide' && (
                <motion.div key="ios-guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-white font-black text-xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                        INSTALLE SUR TON IPHONE
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">3 étapes rapides</p>
                    </div>
                    <button onClick={dismiss} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 flex-shrink-0 ml-3">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2.5 mb-5">
                    {[
                      { n: 1, text: 'Appuie sur le bouton Partager', sub: 'Icône carré avec une flèche vers le haut, en bas de l\'écran' },
                      { n: 2, text: 'Tape "Sur l\'écran d\'accueil"', sub: 'Défile dans la liste des options' },
                      { n: 3, text: 'Confirme en appuyant "Ajouter"', sub: '' },
                    ].map(({ n, text, sub }) => (
                      <div key={n} className="flex items-start gap-3 p-3 rounded-xl glass border border-white/5">
                        <div className="w-7 h-7 rounded-full bg-[#009ADE]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[#009ADE] font-black text-xs">{n}</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{text}</p>
                          {sub && <p className="text-white/35 text-xs mt-0.5">{sub}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl p-3.5 mb-5 border border-[#F5C518]/20 flex items-center gap-3" style={{ background: 'rgba(245,197,24,0.06)' }}>
                    <Zap size={15} className="text-[#F5C518] flex-shrink-0" />
                    <p className="text-white/55 text-xs leading-relaxed">
                      Ouvre l'app depuis ton écran d'accueil pour réclamer tes{' '}
                      <span className="text-[#F5C518] font-bold">+{REWARD_COINS} coins + 1 pack gratuit</span>
                    </p>
                  </div>

                  <button onClick={dismiss} className="w-full py-2 text-white/25 text-sm hover:text-white/50 transition-colors">
                    Plus tard
                  </button>
                </motion.div>
              )}

              {/* ── iOS standalone → claim reward ───────────────────────── */}
              {screen === 'ios-claim' && (
                <motion.div key="ios-claim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
                  <div className="text-center mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                      className="w-16 h-16 rounded-3xl bg-[#F5C518]/15 flex items-center justify-center mx-auto mb-4"
                    >
                      <Globe size={30} className="text-[#F5C518]" />
                    </motion.div>
                    <p className="text-white font-black text-2xl leading-tight" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                      MERCI D'AVOIR<br />INSTALLÉ WORLDSQUAD !
                    </p>
                    <p className="text-white/40 text-sm mt-1">Ton bonus t'attend</p>
                  </div>

                  <div className="rounded-2xl p-5 mb-5 border border-[#F5C518]/25 text-center" style={{ background: 'rgba(245,197,24,0.06)' }}>
                    <p className="text-[#F5C518] font-black text-4xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                      +{REWARD_COINS} COINS
                    </p>
                    <p className="text-white/40 text-sm mt-1">+ 1 pack gratuit dans ta collection</p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={claimReward}
                    disabled={claiming}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-black text-xl disabled:opacity-70"
                    style={{
                      fontFamily: 'Bebas Neue, sans-serif',
                      background: 'linear-gradient(135deg, #F5C518, #FFD700)',
                      boxShadow: '0 4px 24px rgba(245,197,24,0.4)',
                    }}
                    animate={!claiming ? { boxShadow: ['0 4px 20px rgba(245,197,24,0.3)', '0 4px 35px rgba(245,197,24,0.6)', '0 4px 20px rgba(245,197,24,0.3)'] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Zap size={20} />
                    {claiming ? 'RÉCLAMATION…' : 'RÉCLAMER MON BONUS'}
                  </motion.button>
                </motion.div>
              )}

              {/* ── Success ─────────────────────────────────────────────── */}
              {screen === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 size={32} className="text-green-400" />
                  </motion.div>
                  <p className="text-white font-black text-2xl mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    BONUS RÉCLAMÉ !
                  </p>
                  <p className="text-[#F5C518] font-black text-3xl mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    +{REWARD_COINS} COINS
                  </p>
                  <p className="text-white/40 text-sm">+ 1 pack ajouté à ta collection</p>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
