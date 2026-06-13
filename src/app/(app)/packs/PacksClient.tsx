'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Sparkles, Trophy } from 'lucide-react'
import { GameCard } from '@/components/ui/Card'
import { CoinDisplay } from '@/components/ui/CoinDisplay'
import { useMusicContext } from '@/components/MusicProvider'
import { ShareSheet } from '@/components/ShareSheet'
import { InstagramStoryShare } from '@/components/InstagramStoryShare'
import { PACK_CONFIGS, RARITY_COLORS, RARITY_GLOW } from '@/types'
import type { Card, CardRarity } from '@/types'
import toast from 'react-hot-toast'

type PackKey = keyof typeof PACK_CONFIGS
type Phase = 'idle' | 'shaking' | 'dealing' | 'revealing' | 'done'

interface RevealCardProps {
  card: Card
  index: number
  shouldReveal: boolean
  totalCards: number
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

function RevealCard({ card, index, shouldReveal, totalCards }: RevealCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [glowing, setGlowing] = useState(false)

  useEffect(() => {
    if (!shouldReveal) return
    const t1 = setTimeout(() => {
      setFlipped(true)
      // Haptic feedback based on rarity
      if (card.rarity === 'Legend') vibrate([40, 30, 80, 30, 150])
      else if (card.rarity === 'Epic') vibrate([40, 30, 80])
      else vibrate(25)
      setTimeout(() => setGlowing(true), 400)
    }, index * 750)
    return () => clearTimeout(t1)
  }, [shouldReveal, index, card.rarity])

  const isSpecial = card.rarity === 'Epic' || card.rarity === 'Legend'

  return (
    <motion.div
      initial={{ y: 60, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="relative flex-shrink-0"
      style={{ perspective: 900 }}
    >
      {/* Legend/Epic burst */}
      <AnimatePresence>
        {glowing && isSpecial && (
          <>
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full pointer-events-none z-20"
                style={{
                  background: RARITY_COLORS[card.rarity],
                  top: '50%',
                  left: '50%',
                }}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i / 12) * Math.PI * 2) * (card.rarity === 'Legend' ? 120 : 80),
                  y: Math.sin((i / 12) * Math.PI * 2) * (card.rarity === 'Legend' ? 120 : 80),
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Rarity label pop */}
      <AnimatePresence>
        {glowing && isSpecial && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: -24, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 font-black text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              color: RARITY_COLORS[card.rarity],
              background: `${RARITY_COLORS[card.rarity]}20`,
              border: `1px solid ${RARITY_COLORS[card.rarity]}60`,
              fontFamily: 'Bebas Neue, sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            {card.rarity === 'Legend' ? 'LÉGENDAIRE' : 'ÉPIQUE'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card with 3D flip */}
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: glowing ? RARITY_GLOW[card.rarity] : 'none',
          borderRadius: '0.75rem',
          transition: 'box-shadow 0.4s ease',
        }}
        animate={{ rotateY: flipped ? 0 : 180 }}
        transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front — actual card */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          <GameCard card={card} owned size={totalCards <= 3 ? 'lg' : 'md'} />
        </div>

        {/* Back — official Panini-style card back */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            inset: 0,
          }}
          className="rounded-xl flex flex-col overflow-hidden border-2 border-[#F5C518]/25"
        >
          {/* Red/gold stripe at top */}
          <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #C8102E, #F5C518)' }} />
          <div className="flex-1 flex flex-col items-center justify-center gap-1 p-2" style={{ background: 'linear-gradient(160deg, #0A1F3D, #060F1A)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-[#F5C518]/40 flex items-center justify-center mb-1">
              <Globe size={14} className="text-[#F5C518]/60" />
            </div>
            <div className="text-[#F5C518]/50 font-black text-xs leading-none text-center" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>WORLD</div>
            <div className="text-[#F5C518]/50 font-black text-xs leading-none text-center" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>SQUAD</div>
            <div className="text-white/15 font-bold text-[9px] mt-1 text-center">2026</div>
          </div>
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #F5C518, #C8102E)' }} />
        </div>
      </motion.div>
    </motion.div>
  )
}

interface Props {
  initialCoins: number
  pseudo: string
}

export function PacksClient({ initialCoins, pseudo }: Props) {
  const [coins, setCoins] = useState(initialCoins)
  const [phase, setPhase] = useState<Phase>('idle')
  const [selectedPack, setSelectedPack] = useState<PackKey | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const { playPackOpening, stopPackOpening } = useMusicContext()

  const packEntries = Object.entries(PACK_CONFIGS) as [PackKey, (typeof PACK_CONFIGS)[PackKey]][]

  const handleOpenPack = useCallback(async (packKey: PackKey) => {
    if (loading) return
    const config = PACK_CONFIGS[packKey]

    if (coins < config.cost) {
      toast.error(`Il te faut ${config.cost.toLocaleString()} coins pour ce pack !`)
      return
    }

    setLoading(true)
    setSelectedPack(packKey)
    setPhase('shaking')
    vibrate([30, 20, 30, 20, 100])
    playPackOpening()

    // Wait for shaking animation
    await new Promise((r) => setTimeout(r, 1400))
    setPhase('dealing')

    // Call API (debit + card selection)
    const res = await fetch('/api/packs/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packType: packKey }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Erreur lors de l\'ouverture')
      setPhase('idle')
      setLoading(false)
      return
    }

    setCards(data.cards ?? [])
    if (data.newBalance !== undefined) setCoins(data.newBalance)

    // Show mission toast if first pack today
    if (data.mission?.coins) {
      setTimeout(() => toast.success(`Mission du jour +${data.mission.coins} coins !`, { icon: '🎁' }), 800)
    }

    // Short dealing pause then start revealing
    await new Promise((r) => setTimeout(r, 600))
    setPhase('revealing')

    // Auto-done after all cards revealed
    const totalRevealTime = (data.cards?.length ?? 0) * 750 + 1200
    setTimeout(() => setPhase('done'), totalRevealTime)
    setLoading(false)
  }, [coins, loading])

  const reset = () => {
    setPhase('idle')
    setSelectedPack(null)
    setCards([])
    stopPackOpening()
  }

  const packColorOf = (key: PackKey) => PACK_CONFIGS[key].color

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            OUVRIR DES PACKS
          </h1>
          <p className="text-gray-500 text-sm">Plus le pack est cher, plus tu trouveras des Légendes</p>
        </div>
        <CoinDisplay amount={coins} size="lg" />
      </div>

      <AnimatePresence mode="wait">
        {/* ── PACK SELECTION ── */}
        {phase === 'idle' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {packEntries.map(([key, config]) => {
                const canAfford = coins >= config.cost
                return (
                  <motion.div
                    key={key}
                    whileHover={canAfford ? { scale: 1.04, y: -8 } : {}}
                    whileTap={canAfford ? { scale: 0.97 } : {}}
                    onClick={() => canAfford && handleOpenPack(key)}
                    className={`glass rounded-2xl p-5 border text-center flex flex-col gap-3 transition-all ${
                      canAfford ? 'cursor-pointer hover:border-white/20' : 'opacity-50 cursor-not-allowed'
                    }`}
                    style={{
                      borderColor: `${config.color}30`,
                      boxShadow: canAfford ? `0 0 30px ${config.color}15` : 'none',
                    }}
                  >
                    {/* Pack visual */}
                    <div
                      className="w-20 h-28 mx-auto rounded-xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${config.color}15, ${config.color}35)`,
                        border: `2px solid ${config.color}50`,
                        boxShadow: `0 0 20px ${config.color}25`,
                      }}
                    >
                      <Globe size={36} className="z-10 opacity-60" style={{ color: config.color }} />
                      {/* Shimmer */}
                      <motion.div
                        className="absolute inset-0 opacity-20"
                        style={{
                          background: `linear-gradient(45deg, transparent 30%, ${config.color}80 50%, transparent 70%)`,
                          backgroundSize: '200% 200%',
                        }}
                        animate={{ backgroundPosition: ['0% 0%', '200% 200%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>

                    {/* Name */}
                    <h3 className="font-black text-white text-base leading-tight" style={{ fontFamily: 'Bebas Neue, sans-serif', color: config.color }}>
                      {config.name}
                    </h3>

                    {/* Cards count */}
                    <p className="text-gray-500 text-xs">{config.cards} cartes</p>

                    {/* Odds */}
                    <div className="space-y-1 text-left">
                      {(Object.entries(config.odds) as [CardRarity, number][])
                        .filter(([, v]) => v > 0)
                        .map(([rarity, pct]) => (
                          <div key={rarity} className="flex items-center justify-between">
                            <span className="text-xs font-semibold" style={{ color: RARITY_COLORS[rarity] }}>
                              {rarity}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct * 100}%`, background: RARITY_COLORS[rarity] }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-7 text-right">{Math.round(pct * 100)}%</span>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Buy button */}
                    <button
                      className="w-full py-2.5 rounded-xl font-black text-black text-sm transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ background: canAfford ? config.color : '#374151', fontFamily: 'Bebas Neue, sans-serif' }}
                      disabled={!canAfford}
                    >
                      {config.cost.toLocaleString()} COINS
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── SHAKING ── */}
        {phase === 'shaking' && selectedPack && (
          <motion.div
            key="shaking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[450px] gap-6"
          >
            <p className="text-gray-500 font-semibold text-sm uppercase tracking-widest animate-pulse">
              Ouverture en cours…
            </p>
            <motion.div
              animate={{
                rotate: [-8, 8, -8, 8, -6, 6, -4, 4, 0],
                scale: [1, 1.05, 1, 1.08, 1, 1.1, 1.12, 1.15, 1.2],
              }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
              className="w-36 h-52 rounded-2xl flex flex-col items-center justify-center gap-2 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${packColorOf(selectedPack)}20, ${packColorOf(selectedPack)}50)`,
                border: `3px solid ${packColorOf(selectedPack)}`,
                boxShadow: `0 0 80px ${packColorOf(selectedPack)}60`,
              }}
            >
              <Globe size={52} style={{ color: packColorOf(selectedPack), opacity: 0.8 }} />
              <span className="text-white font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                {PACK_CONFIGS[selectedPack].name}
              </span>
              {/* Animated shimmer */}
              <motion.div
                className="absolute inset-0"
                style={{ background: `linear-gradient(45deg, transparent 40%, ${packColorOf(selectedPack)}50 50%, transparent 60%)` }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3 }}
              />
            </motion.div>
          </motion.div>
        )}

        {/* ── DEALING + REVEALING + DONE ── */}
        {(phase === 'dealing' || phase === 'revealing' || phase === 'done') && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-10"
          >
            {phase !== 'done' && (
              <p className="text-gray-500 text-sm uppercase tracking-widest animate-pulse font-semibold">
                {phase === 'dealing' ? 'Distribution…' : 'Révélation…'}
              </p>
            )}

            {phase === 'done' && (
              <motion.h2
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-3xl font-black text-white text-center"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                TES NOUVELLES CARTES !
              </motion.h2>
            )}

            {/* Cards */}
            <div className={`flex items-end justify-center gap-2 sm:gap-4 flex-wrap ${cards.length > 3 ? 'max-w-2xl' : 'max-w-lg'} mx-auto px-2`}>
              {cards.map((card, i) => (
                <RevealCard
                  key={`${card.id}-${i}`}
                  card={card}
                  index={i}
                  shouldReveal={phase === 'revealing' || phase === 'done'}
                  totalCards={cards.length}
                />
              ))}
            </div>

            {/* Summary on done */}
            {phase === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-4"
              >
                {/* Rarity breakdown */}
                <div className="flex gap-3 flex-wrap justify-center">
                  {(['Legend', 'Epic', 'Rare', 'Common'] as CardRarity[]).map((rarity) => {
                    const count = cards.filter((c) => c.rarity === rarity).length
                    if (count === 0) return null
                    return (
                      <div
                        key={rarity}
                        className="px-3 py-1 rounded-lg text-xs font-bold"
                        style={{ background: `${RARITY_COLORS[rarity]}20`, color: RARITY_COLORS[rarity], border: `1px solid ${RARITY_COLORS[rarity]}40` }}
                      >
                        {count}× {rarity}
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-3 flex-wrap justify-center">
                  <button
                    onClick={reset}
                    className="bg-[#F5C518] hover:bg-[#ffd700] text-black font-black px-8 py-3 rounded-xl transition-all hover:scale-105"
                    style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                  >
                    OUVRIR UN AUTRE PACK
                  </button>
                  <a
                    href="/collection"
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm flex items-center"
                  >
                    Voir ma collection →
                  </a>
                  {(() => {
                    const best = cards.find((c) => c.rarity === 'Legend') ?? cards.find((c) => c.rarity === 'Epic')
                    if (!best) return null
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.6, type: 'spring', damping: 18, stiffness: 260 }}
                        className="flex gap-2 flex-wrap justify-center"
                      >
                        <InstagramStoryShare
                          name={best.name}
                          rarity={best.rarity as 'Epic' | 'Legend'}
                          nation={best.nation ?? ''}
                          pseudo={pseudo}
                        />
                        <ShareSheet
                          url={`/share/pack?card=${best.id}&pseudo=${encodeURIComponent(pseudo)}`}
                          title={`J'ai obtenu ${best.name} (${best.rarity}) sur WorldSquad !`}
                          text={`Je viens d'ouvrir un pack et j'ai obtenu ${best.name} ${best.rarity === 'Legend' ? 'LÉGENDAIRE' : 'ÉPIQUE'} ! Rejoins-moi sur WorldSquad`}
                          label="Partager"
                          variant="outline"
                        />
                      </motion.div>
                    )
                  })()}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
