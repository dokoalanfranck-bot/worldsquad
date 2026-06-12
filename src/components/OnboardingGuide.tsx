'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, Layers, Swords, Trophy,
  ShoppingBag, Settings, Package, X, ChevronRight,
  ChevronLeft, HelpCircle, Sparkles, Monitor, Smartphone,
} from 'lucide-react'

const LS_KEY = 'ws_onboarded_v1'

interface Step {
  icon: React.ReactNode
  emoji: string
  title: string
  description: string
  tip: { mobile: string; desktop: string }
  color: string
}

const STEPS: Step[] = [
  {
    icon: <Sparkles size={32} />,
    emoji: '🏆',
    title: 'Bienvenue sur WorldSquad',
    description: 'L\'app officielle de la Coupe du Monde 2026. Suis les matchs en direct, collecte des cartes de joueurs et affronte d\'autres fans en battle.',
    tip: {
      mobile: 'Utilise la barre de navigation en bas de l\'écran pour te déplacer.',
      desktop: 'Le menu est sur le côté gauche de l\'écran.',
    },
    color: '#F5C518',
  },
  {
    icon: <LayoutDashboard size={32} />,
    emoji: '📊',
    title: 'Dashboard',
    description: 'Retrouve ici tous les matchs en cours avec les scores en temps réel, le classement des groupes et tes stats personnelles.',
    tip: {
      mobile: 'Icône 🏠 en bas à gauche.',
      desktop: 'Clique sur "Dashboard" dans le menu latéral.',
    },
    color: '#60A5FA',
  },
  {
    icon: <Calendar size={32} />,
    emoji: '⚽',
    title: 'Matchs & Pronostics',
    description: 'Consulte le calendrier de tous les matchs. Fais tes pronostics avant le coup d\'envoi et gagne des coins si tu as raison.',
    tip: {
      mobile: 'Icône 📅 en bas (2ème position).',
      desktop: '"Matchs & Pronostics" dans le menu.',
    },
    color: '#34D399',
  },
  {
    icon: <Package size={32} />,
    emoji: '🎁',
    title: 'Ouverture de Packs',
    description: 'Dépense tes coins pour ouvrir des packs et obtenir des cartes de joueurs — Commun, Rare, Épique ou Légendaire. Chaque ouverture est unique.',
    tip: {
      mobile: 'Bouton central ⭐ au milieu de la barre de navigation.',
      desktop: '"Packs" dans le menu latéral.',
    },
    color: '#A78BFA',
  },
  {
    icon: <Layers size={32} />,
    emoji: '🃏',
    title: 'Ma Collection',
    description: 'Visualise toutes tes cartes obtenues, filtre par nation ou rareté, et consulte les stats de chaque joueur.',
    tip: {
      mobile: 'Icône 🃏 en bas à droite.',
      desktop: '"Ma Collection" dans le menu.',
    },
    color: '#F97316',
  },
  {
    icon: <Swords size={32} />,
    emoji: '⚔️',
    title: 'Battles',
    description: 'Compose une équipe avec tes cartes et affronte d\'autres joueurs. Le gagnant choisit une carte dans la collection du perdant et la vole définitivement.',
    tip: {
      mobile: 'Menu burger ☰ en bas à droite → "Battles".',
      desktop: '"Battles" dans le menu latéral.',
    },
    color: '#EF4444',
  },
  {
    icon: <Trophy size={32} />,
    emoji: '🥇',
    title: 'Classement',
    description: 'Compare tes performances avec tous les joueurs de l\'app. Le classement se base sur tes pronostics réussis, tes battles gagnés et ta série quotidienne.',
    tip: {
      mobile: 'Menu burger ☰ → "Classement".',
      desktop: '"Classement" dans le menu.',
    },
    color: '#FBBF24',
  },
  {
    icon: <ShoppingBag size={32} />,
    emoji: '🛒',
    title: 'Boutique',
    description: 'Achète des coins ou des packs premium. Plus tu joues chaque jour, plus tu gagnes de la monnaie virtuelle gratuitement.',
    tip: {
      mobile: 'Menu burger ☰ → "Boutique".',
      desktop: '"Boutique" dans le menu.',
    },
    color: '#EC4899',
  },
  {
    icon: <Settings size={32} />,
    emoji: '⚙️',
    title: 'Paramètres',
    description: 'Modifie ton pseudo, ta nation, active les notifications push pour les matchs en direct, et gère la musique de l\'app.',
    tip: {
      mobile: 'Menu burger ☰ → "Paramètres".',
      desktop: 'Icône ⚙️ en bas du menu latéral.',
    },
    color: '#6B7280',
  },
]

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-5 h-1.5 bg-[#F5C518]'
              : i < current
              ? 'w-1.5 h-1.5 bg-[#F5C518]/40'
              : 'w-1.5 h-1.5 bg-white/15'
          }`}
        />
      ))}
    </div>
  )
}

function PlatformTip({ step, isMobile }: { step: Step; isMobile: boolean }) {
  const tip = isMobile ? step.tip.mobile : step.tip.desktop
  const Icon = isMobile ? Smartphone : Monitor
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8">
      <Icon size={13} className="text-white/40 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-white/50 leading-relaxed">{tip}</p>
    </div>
  )
}

export function OnboardingGuide() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const done = localStorage.getItem(LS_KEY)
    if (!done) {
      const t = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    localStorage.setItem(LS_KEY, 'true')
  }, [])

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setDirection(1)
      setStep((s) => s + 1)
    } else {
      close()
    }
  }, [step, close])

  const prev = useCallback(() => {
    if (step > 0) {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }, [step])

  const current = STEPS[step]

  return (
    <>
      {/* Floating help button */}
      <button
        onClick={() => { setStep(0); setOpen(true) }}
        title="Guide de l'application"
        className="fixed bottom-24 left-4 lg:bottom-6 lg:left-6 z-40 w-10 h-10 rounded-full bg-[#12121f]/80 border border-white/10 text-white/30 hover:text-white/70 hover:border-white/25 flex items-center justify-center shadow-lg transition-all"
      >
        <HelpCircle size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              key="panel"
              initial={{ y: 48, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 32, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl overflow-hidden border border-white/8 bg-[#0f0f1c] shadow-2xl"
            >
              {/* Color accent bar */}
              <div
                className="h-0.5 w-full transition-all duration-500"
                style={{ background: `linear-gradient(90deg, ${current.color}00, ${current.color}, ${current.color}00)` }}
              />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <StepDots total={STEPS.length} current={step} />
                  <button
                    onClick={close}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Step content — animated */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: direction * 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -28 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    {/* Icon */}
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                        style={{ background: `${current.color}18`, border: `1px solid ${current.color}30` }}
                      >
                        {current.emoji}
                      </div>
                      <div>
                        <p className="text-xs text-white/30 mb-0.5">
                          {step + 1} / {STEPS.length}
                        </p>
                        <h3 className="font-bebas text-2xl text-white leading-tight">{current.title}</h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-white/65 leading-relaxed mb-4">
                      {current.description}
                    </p>

                    {/* Platform tip */}
                    <PlatformTip step={current} isMobile={isMobile} />
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center gap-2 mt-5">
                  {step > 0 ? (
                    <button
                      onClick={prev}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={close}
                      className="h-10 px-4 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                    >
                      Passer
                    </button>
                  )}

                  <button
                    onClick={next}
                    className="flex-1 h-10 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{ background: current.color, color: '#000' }}
                  >
                    {step === STEPS.length - 1 ? (
                      <>C\'est parti ! 🚀</>
                    ) : (
                      <>
                        Suivant
                        <ChevronRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
