'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, ChevronRight, Sparkles } from 'lucide-react'
import { GameCard } from '@/components/ui/Card'
import { CoinDisplay } from '@/components/ui/CoinDisplay'
import { useMusicContext } from '@/components/MusicProvider'
import { ShareSheet } from '@/components/ShareSheet'
import { InstagramStoryShare } from '@/components/InstagramStoryShare'
import { PACK_CONFIGS, RARITY_COLORS, RARITY_GLOW } from '@/types'
import type { Card, CardRarity } from '@/types'
import toast from 'react-hot-toast'

type PackKey = keyof typeof PACK_CONFIGS
type Phase = 'idle' | 'shaking' | 'opening'

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
}

// ── Single card (face-down until tapped) ────────────────────────────────────
function TapRevealCard({
  card,
  isActive,
  isRevealed,
  onTap,
}: {
  card: Card
  isActive: boolean
  isRevealed: boolean
  onTap: () => void
}) {
  const isSpecial = card.rarity === 'Epic' || card.rarity === 'Legend'
  const particleCount = card.rarity === 'Legend' ? 14 : 10
  const particleRadius = card.rarity === 'Legend' ? 75 : 52

  return (
    <motion.div
      initial={{ y: 60, opacity: 0, scale: 0.8 }}
      animate={{
        y: 0,
        opacity: isRevealed || isActive ? 1 : 0.45,
        scale: isActive && !isRevealed ? 1.04 : 1,
      }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      onClick={() => isActive && !isRevealed && onTap()}
      className="relative"
      style={{ cursor: isActive && !isRevealed ? 'pointer' : 'default' }}
    >
      {/* Pulsing ring on active */}
      {isActive && !isRevealed && (
        <motion.div
          className="absolute -inset-1.5 rounded-xl"
          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.03, 1] }}
          transition={{ duration: 1.1, repeat: Infinity }}
          style={{ border: '2px solid #F5C518', boxShadow: '0 0 18px rgba(245,197,24,0.5)', zIndex: -1 }}
        />
      )}

      {/* Particle burst on reveal */}
      <AnimatePresence>
        {isRevealed && isSpecial && (
          <>
            {Array.from({ length: particleCount }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                style={{ background: RARITY_COLORS[card.rarity], top: '50%', left: '50%', zIndex: 20 }}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i / particleCount) * Math.PI * 2) * particleRadius,
                  y: Math.sin((i / particleCount) * Math.PI * 2) * particleRadius,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Rarity badge pop */}
      <AnimatePresence>
        {isRevealed && isSpecial && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.8 }}
            animate={{ opacity: 1, y: -24, scale: 1 }}
            className="absolute -top-1 left-1/2 -translate-x-1/2 font-black text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              color: RARITY_COLORS[card.rarity],
              background: `${RARITY_COLORS[card.rarity]}20`,
              border: `1px solid ${RARITY_COLORS[card.rarity]}60`,
              fontFamily: 'Bebas Neue, sans-serif',
              zIndex: 30,
            }}
          >
            {card.rarity === 'Legend' ? '⚡ LÉGENDAIRE !' : '✦ ÉPIQUE !'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D flip */}
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: isRevealed ? RARITY_GLOW[card.rarity] : 'none',
          borderRadius: '0.75rem',
          transition: 'box-shadow 0.4s ease',
        }}
        animate={{ rotateY: isRevealed ? 0 : 180 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          <GameCard card={card} owned size="sm" />
        </div>
        {/* Back */}
        <div
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}
          className="rounded-xl flex flex-col overflow-hidden border-2 border-[#F5C518]/25"
        >
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #C8102E, #F5C518)' }} />
          <div
            className="flex-1 flex flex-col items-center justify-center gap-0.5 p-1.5"
            style={{ background: 'linear-gradient(160deg, #0A1F3D, #060F1A)' }}
          >
            <div className="w-7 h-7 rounded-full border border-[#F5C518]/40 flex items-center justify-center mb-0.5">
              <Globe size={12} className="text-[#F5C518]/60" />
            </div>
            <div className="text-[#F5C518]/50 font-black text-[10px]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>WORLD</div>
            <div className="text-[#F5C518]/50 font-black text-[10px]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>SQUAD</div>
            <div className="text-white/15 font-bold text-[8px] mt-0.5">2026</div>
          </div>
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #F5C518, #C8102E)' }} />
        </div>
      </motion.div>

      {/* "Tap" hint */}
      {isActive && !isRevealed && (
        <motion.p
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[#F5C518] text-[9px] font-black whitespace-nowrap"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          APPUIE !
        </motion.p>
      )}
    </motion.div>
  )
}

// ── Full-screen reveal overlay ───────────────────────────────────────────────
function PackRevealOverlay({
  cards,
  packColor,
  packName,
  onClose,
  pseudo,
}: {
  cards: Card[]
  packColor: string
  packName: string
  onClose: () => void
  pseudo: string
}) {
  const [revealedCount, setRevealedCount] = useState(0)
  const [legendFlash, setLegendFlash] = useState(false)
  const allRevealed = revealedCount >= cards.length
  const nextCard = cards[revealedCount]

  function revealNext() {
    if (revealedCount >= cards.length) return
    const card = cards[revealedCount]
    if (card.rarity === 'Legend') {
      vibrate([40, 30, 80, 30, 150])
      setLegendFlash(true)
      setTimeout(() => {
        setLegendFlash(false)
        setRevealedCount((n) => n + 1)
      }, 650)
    } else {
      if (card.rarity === 'Epic') vibrate([40, 30, 80])
      else vibrate(25)
      setRevealedCount((n) => n + 1)
    }
  }

  const isLegendNext = nextCard?.rarity === 'Legend'
  const bestCard = cards.find((c) => c.rarity === 'Legend') ?? cards.find((c) => c.rarity === 'Epic')

  // Grid columns: 3 for ≤6 cards, adapt for more
  const cols = Math.min(3, cards.length)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ background: 'linear-gradient(180deg, #030810 0%, #060d18 100%)' }}
    >
      {/* Legend flash burst */}
      <AnimatePresence>
        {legendFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.55 }}
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: 60,
              background: 'radial-gradient(ellipse at center, rgba(245,197,24,0.92) 0%, rgba(245,197,24,0.3) 40%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe pt-6 pb-2 flex-shrink-0">
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold">Pack ouvert</p>
          <p className="font-black text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif', color: packColor }}>
            {packName}
          </p>
        </div>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              animate={{
                width: i < revealedCount ? '10px' : '7px',
                height: i < revealedCount ? '10px' : '7px',
                background: i < revealedCount
                  ? (card.rarity === 'Legend' ? '#F5C518' : card.rarity === 'Epic' ? '#A855F7' : card.rarity === 'Rare' ? '#00D4FF' : '#9CA3AF')
                  : 'rgba(255,255,255,0.15)',
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </div>

      {/* Cards area — 3-col responsive grid */}
      <div className="flex-1 flex items-center justify-center overflow-visible py-6 px-4">
        <div
          className="grid mx-auto"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 96px))`,
            gap: '12px',
          }}
        >
          {cards.map((card, i) => (
            <div key={`${card.id}-${i}`} className="flex justify-center">
              <TapRevealCard
                card={card}
                isActive={i === revealedCount}
                isRevealed={i < revealedCount}
                onTap={revealNext}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom area */}
      <div className="px-5 pb-safe pb-8 pt-4 flex-shrink-0 flex flex-col items-center gap-3">
        <AnimatePresence mode="wait">
          {!allRevealed ? (
            <motion.button
              key="reveal-btn"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              whileTap={{ scale: 0.96 }}
              onClick={revealNext}
              className="w-full max-w-sm py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-2"
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                background: isLegendNext
                  ? 'linear-gradient(135deg, #F5C518, #FFD700)'
                  : 'rgba(255,255,255,0.08)',
                color: isLegendNext ? '#000' : '#fff',
                border: isLegendNext ? 'none' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isLegendNext ? '0 4px 30px rgba(245,197,24,0.5)' : 'none',
              }}
            >
              {isLegendNext ? '⚡ RÉVÉLER LA LÉGENDE' : 'RETOURNER LA CARTE'}
              <ChevronRight size={18} />
            </motion.button>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm flex flex-col items-center gap-3"
            >
              {/* Rarity recap */}
              <div className="flex gap-2 flex-wrap justify-center">
                {(['Legend', 'Epic', 'Rare', 'Common'] as CardRarity[]).map((rarity) => {
                  const count = cards.filter((c) => c.rarity === rarity).length
                  if (count === 0) return null
                  return (
                    <div
                      key={rarity}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{
                        background: `${RARITY_COLORS[rarity]}20`,
                        color: RARITY_COLORS[rarity],
                        border: `1px solid ${RARITY_COLORS[rarity]}40`,
                      }}
                    >
                      {count}× {rarity}
                    </div>
                  )
                })}
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-black text-black text-xl"
                style={{
                  fontFamily: 'Bebas Neue, sans-serif',
                  background: 'linear-gradient(135deg, #F5C518, #FFD700)',
                  boxShadow: '0 4px 24px rgba(245,197,24,0.4)',
                }}
              >
                OUVRIR UN AUTRE PACK
              </button>

              {bestCard && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-2 flex-wrap justify-center"
                >
                  <InstagramStoryShare
                    name={bestCard.name}
                    rarity={bestCard.rarity as 'Epic' | 'Legend'}
                    nation={bestCard.nation ?? ''}
                    pseudo={pseudo}
                  />
                  <ShareSheet
                    url={`/share/pack?card=${bestCard.id}&pseudo=${encodeURIComponent(pseudo)}`}
                    title={`J'ai obtenu ${bestCard.name} (${bestCard.rarity}) sur WorldSquad !`}
                    text={`Je viens d'ouvrir un pack et j'ai obtenu ${bestCard.name} ${bestCard.rarity === 'Legend' ? 'LÉGENDAIRE' : 'ÉPIQUE'} ! Rejoins-moi sur WorldSquad`}
                    label="Partager"
                    variant="outline"
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Main client ──────────────────────────────────────────────────────────────
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

    await new Promise((r) => setTimeout(r, 1400))

    try {
      const res = await fetch('/api/packs/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packType: packKey }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Erreur lors de l\'ouverture')
        setPhase('idle'); setLoading(false); stopPackOpening(); return
      }

      setCards(data.cards ?? [])
      if (data.newBalance !== undefined) setCoins(data.newBalance)
      if (data.mission?.coins) {
        setTimeout(() => toast.success(`Mission du jour +${data.mission.coins} coins !`, { icon: '🎁' }), 1000)
      }

      setPhase('opening')
      setLoading(false)
    } catch {
      toast.error('Erreur réseau — réessaie')
      setPhase('idle'); setLoading(false); stopPackOpening()
    }
  }, [coins, loading, playPackOpening, stopPackOpening])

  function reset() {
    setPhase('idle')
    setSelectedPack(null)
    setCards([])
    stopPackOpening()
  }

  const packColorOf = (key: PackKey) => PACK_CONFIGS[key].color

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-4xl font-black text-white leading-none" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            OUVRIR DES PACKS
          </h1>
          <p className="text-gray-500 text-sm mt-1">Plus le pack est cher, plus tu trouveras des Légendes</p>
        </div>
        <div className="flex-shrink-0">
          <CoinDisplay amount={coins} size="lg" />
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── PACK SELECTION ── */}
        {phase === 'idle' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 gap-3"
          >
            {packEntries.map(([key, config]) => {
              const canAfford = coins >= config.cost
              return (
                <motion.div
                  key={key}
                  whileTap={canAfford ? { scale: 0.97 } : {}}
                  onClick={() => canAfford && handleOpenPack(key)}
                  className={`glass rounded-2xl p-4 border flex flex-col gap-2.5 transition-all ${
                    canAfford ? 'cursor-pointer active:border-white/20' : 'opacity-45 cursor-not-allowed'
                  }`}
                  style={{
                    borderColor: `${config.color}30`,
                    boxShadow: canAfford ? `0 0 24px ${config.color}12` : 'none',
                  }}
                >
                  {/* Pack visual */}
                  <div
                    className="w-full aspect-[3/4] rounded-xl flex items-center justify-center relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${config.color}15, ${config.color}35)`,
                      border: `2px solid ${config.color}50`,
                    }}
                  >
                    <Globe size={40} className="z-10 opacity-60" style={{ color: config.color }} />
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(45deg, transparent 30%, ${config.color}60 50%, transparent 70%)`,
                        backgroundSize: '200% 200%',
                      }}
                      animate={{ backgroundPosition: ['0% 0%', '200% 200%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Card count badge */}
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: `${config.color}30`, color: config.color, border: `1px solid ${config.color}60` }}
                    >
                      {config.cards}
                    </div>
                  </div>

                  <h3
                    className="font-black text-base leading-none"
                    style={{ fontFamily: 'Bebas Neue, sans-serif', color: config.color }}
                  >
                    {config.name}
                  </h3>

                  {/* Odds compact */}
                  <div className="space-y-0.5">
                    {(Object.entries(config.odds) as [CardRarity, number][])
                      .filter(([, v]) => v > 0)
                      .map(([rarity, pct]) => (
                        <div key={rarity} className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold" style={{ color: RARITY_COLORS[rarity] }}>
                            {rarity}
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="w-10 h-0.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct * 100}%`, background: RARITY_COLORS[rarity] }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 w-6 text-right">{Math.round(pct * 100)}%</span>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Cost button */}
                  <div
                    className="w-full py-2.5 rounded-xl font-black text-sm text-center flex items-center justify-center gap-1.5"
                    style={{
                      background: canAfford ? config.color : '#374151',
                      color: canAfford ? '#000' : '#6b7280',
                      fontFamily: 'Bebas Neue, sans-serif',
                    }}
                  >
                    <Sparkles size={12} />
                    {config.cost.toLocaleString()} COINS
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* ── SHAKING ── */}
        {phase === 'shaking' && selectedPack && (
          <motion.div
            key="shaking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px] gap-6"
          >
            <p className="text-gray-500 font-semibold text-xs uppercase tracking-widest animate-pulse">
              Ouverture en cours…
            </p>
            <motion.div
              animate={{
                rotate: [-8, 8, -8, 8, -6, 6, -4, 4, 0],
                scale: [1, 1.05, 1, 1.08, 1, 1.1, 1.12, 1.15, 1.2],
              }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
              className="rounded-2xl flex flex-col items-center justify-center gap-2 relative overflow-hidden"
              style={{
                width: 140,
                height: 196,
                background: `linear-gradient(135deg, ${packColorOf(selectedPack)}20, ${packColorOf(selectedPack)}50)`,
                border: `3px solid ${packColorOf(selectedPack)}`,
                boxShadow: `0 0 80px ${packColorOf(selectedPack)}60`,
              }}
            >
              <Globe size={52} style={{ color: packColorOf(selectedPack), opacity: 0.8 }} />
              <span className="text-white font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                {PACK_CONFIGS[selectedPack].name}
              </span>
              <motion.div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(45deg, transparent 40%, ${packColorOf(selectedPack)}50 50%, transparent 60%)`,
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3 }}
              />
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── FULL-SCREEN REVEAL OVERLAY ── */}
      <AnimatePresence>
        {phase === 'opening' && selectedPack && (
          <PackRevealOverlay
            cards={cards}
            packColor={packColorOf(selectedPack)}
            packName={PACK_CONFIGS[selectedPack].name}
            onClose={reset}
            pseudo={pseudo}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
