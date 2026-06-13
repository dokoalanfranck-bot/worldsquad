'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2, Film, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type SceneId = 'pack' | 'cards' | 'battle' | 'league'
type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

// ─── Rarity config ────────────────────────────────────────────────────────────

const RARITY: Record<Rarity, { bg: string; border: string; glow: string; label: string; color: string }> = {
  common:    { bg: 'linear-gradient(160deg,#1e3048,#0d1e2e)', border: 'rgba(255,255,255,0.15)', glow: 'none', label: 'COMMON', color: '#9ca3af' },
  rare:      { bg: 'linear-gradient(160deg,#0d2a4a,#091524)', border: '#009ADE', glow: '0 0 16px rgba(0,154,222,0.4)', label: 'RARE', color: '#009ADE' },
  epic:      { bg: 'linear-gradient(160deg,#1e0d42,#0d0920)', border: '#9333ea', glow: '0 0 20px rgba(147,51,234,0.45)', label: 'EPIC', color: '#a855f7' },
  legendary: { bg: 'linear-gradient(160deg,#3d2200,#1f1100)', border: '#F5C518', glow: '0 0 28px rgba(245,197,24,0.55)', label: 'LÉGENDAIRE', color: '#F5C518' },
}

// ─── Card component ───────────────────────────────────────────────────────────

function Card({ rarity, flag, name, stat, statLabel, size = 'md' }: {
  rarity: Rarity; flag: string; name: string; stat: number; statLabel: string; size?: 'sm' | 'md' | 'lg'
}) {
  const r = RARITY[rarity]
  const w = size === 'lg' ? 130 : size === 'md' ? 100 : 70
  const h = Math.round(w * 1.42)
  const fs = {
    rar: 7, flag: size === 'lg' ? 34 : size === 'md' ? 26 : 18,
    name: size === 'lg' ? 13 : size === 'md' ? 10 : 8,
    stat: size === 'lg' ? 30 : size === 'md' ? 22 : 15,
  }
  return (
    <div style={{ width: w, height: h, background: r.bg, border: `1.5px solid ${r.border}`, boxShadow: r.glow, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '7px 5px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 55%)', borderRadius: 10 }} />
      <span style={{ fontSize: fs.rar, fontFamily: 'Bebas Neue,sans-serif', color: r.color, letterSpacing: '0.1em' }}>{r.label}</span>
      <span style={{ fontSize: fs.flag }}>{flag}</span>
      <span style={{ fontSize: fs.name, fontFamily: 'Bebas Neue,sans-serif', color: '#fff', letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1 }}>{name}</span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: fs.stat, fontFamily: 'Bebas Neue,sans-serif', color: r.color, lineHeight: 1 }}>{stat}</div>
        <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>{statLabel}</div>
      </div>
    </div>
  )
}

// ─── Scene 1: Pack opening ────────────────────────────────────────────────────

function PackScene() {
  const scattered = [
    { flag: '🇫🇷', name: 'MBAPPÉ',     stat: 97, statLabel: 'VITESSE',   rarity: 'legendary' as Rarity, tx: 0,    ty: -145, r: 0,   delay: 0.55 },
    { flag: '🇧🇷', name: 'VINICIUS',   stat: 94, statLabel: 'DRIBBLE',   rarity: 'epic' as Rarity,      tx: -135, ty: -60,  r: -22, delay: 0.35 },
    { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'BELLINGHAM', stat: 90, statLabel: 'VISION',    rarity: 'rare' as Rarity,      tx: 135,  ty: -60,  r: 22,  delay: 0.45 },
    { flag: '🇩🇪', name: 'MÜLLER',     stat: 87, statLabel: 'PASSE',     rarity: 'rare' as Rarity,      tx: -105, ty: 105,  r: -16, delay: 0.25 },
    { flag: '🇵🇹', name: 'B. SILVA',   stat: 84, statLabel: 'CONTRÔLE',  rarity: 'common' as Rarity,    tx: 105,  ty: 105,  r: 16,  delay: 0.15 },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'radial-gradient(ellipse 70% 70% at 50% 50%,#0d2240 0%,#091524 100%)' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(245,197,24,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(245,197,24,0.025) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
      <motion.div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,197,24,0.1) 0%,transparent 70%)' }}
        animate={{ scale: [0.8, 1.35, 0.8], opacity: [0.2, 0.7, 0.2] }}
        transition={{ duration: 2.8, repeat: Infinity }} />
      {/* pack */}
      <motion.div
        style={{ width: 130, height: 190, borderRadius: 16, background: 'linear-gradient(160deg,#1a3d5c 0%,#0d2030 50%,#1a3d5c 100%)', border: '2px solid rgba(245,197,24,0.45)', boxShadow: '0 0 40px rgba(245,197,24,0.2),inset 0 1px 0 rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative', overflow: 'hidden', zIndex: 2 }}
        animate={{ y: [0, -8, 0], x: [0, -5, 5, -3, 3, -5, 5, 0], rotate: [0, 0, 0, -2, 2, -2, 2, 0] }}
        transition={{ y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }, x: { duration: 0.5, delay: 2, repeat: Infinity, repeatDelay: 3.5 }, rotate: { duration: 0.5, delay: 2, repeat: Infinity, repeatDelay: 3.5 } }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)', borderRadius: 16 }} />
        <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(245,197,24,0.12)', border: '1.5px solid rgba(245,197,24,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚽</div>
        <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
          <div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#F5C518', fontSize: 17, letterSpacing: '0.12em' }}>WORLD</div>
          <div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#F5C518', fontSize: 17, letterSpacing: '0.12em' }}>SQUAD</div>
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em' }}>PACK 2026</div>
      </motion.div>
      {/* burst */}
      <motion.div
        style={{ position: 'absolute', width: 0, height: 0, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,197,24,0.55) 0%,transparent 65%)', zIndex: 3 }}
        animate={{ width: [0, 380, 0], height: [0, 380, 0], opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.55, delay: 2.3, repeat: Infinity, repeatDelay: 4.45 }} />
      {/* scattered cards */}
      {scattered.map((c, i) => (
        <motion.div key={i} style={{ position: 'absolute', zIndex: 4 }}
          animate={{ x: [0, 0, c.tx], y: [0, 0, c.ty], rotate: [0, 0, c.r], opacity: [0, 0, 1], scale: [0.4, 0.4, 1] }}
          transition={{ duration: 3, times: [0, 0.52, 0.72], delay: c.delay + 2.3, repeat: Infinity, repeatDelay: 2 }}>
          <Card rarity={c.rarity} flag={c.flag} name={c.name} stat={c.stat} statLabel={c.statLabel} size="sm" />
        </motion.div>
      ))}
      {/* bottom text */}
      <motion.div style={{ position: 'absolute', bottom: '8%', textAlign: 'center', zIndex: 5 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 7, times: [0, 0.14, 0.86, 1], repeat: Infinity }}>
        <div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#F5C518', fontSize: 'clamp(1.6rem,5vw,3.2rem)', letterSpacing: '0.1em' }}>OUVRE DES PACKS</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.25em', marginTop: 3 }}>WORLDSQUAD · GRATUIT</div>
      </motion.div>
    </div>
  )
}

// ─── Scene 2: Cards collection ────────────────────────────────────────────────

function CardsScene() {
  const grid = [
    { flag: '🇦🇷', name: 'MESSI',      stat: 99, statLabel: 'MAGIE',      rarity: 'legendary' as Rarity },
    { flag: '🇫🇷', name: 'MBAPPÉ',     stat: 97, statLabel: 'VITESSE',    rarity: 'legendary' as Rarity },
    { flag: '🇧🇷', name: 'VINICIUS',   stat: 94, statLabel: 'DRIBBLE',    rarity: 'epic' as Rarity },
    { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'BELLINGHAM', stat: 91, statLabel: 'VISION',     rarity: 'rare' as Rarity },
    { flag: '🇪🇸', name: 'YAMAL',      stat: 89, statLabel: 'CRÉATIVITÉ', rarity: 'rare' as Rarity },
    { flag: '🇩🇪', name: 'GNABRY',     stat: 85, statLabel: 'VITESSE',    rarity: 'common' as Rarity },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, overflow: 'hidden', background: 'radial-gradient(ellipse 70% 70% at 50% 45%,#1a0d40 0%,#091524 100%)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 10 }}>
        {grid.map((c, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, rotateY: -90, y: 20 }}
            animate={{ opacity: 1, rotateY: 0, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.14, repeat: Infinity, repeatDelay: 5.5 }}
            style={{ perspective: 600 }}>
            <motion.div
              animate={i < 2 ? { boxShadow: ['0 0 16px rgba(245,197,24,0.35)', '0 0 38px rgba(245,197,24,0.8)', '0 0 16px rgba(245,197,24,0.35)'], scale: [1, 1.07, 1] } : {}}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}>
              <Card rarity={c.rarity} flag={c.flag} name={c.name} stat={c.stat} statLabel={c.statLabel} size="md" />
            </motion.div>
          </motion.div>
        ))}
      </div>
      {/* legendary particles */}
      {Array.from({ length: 10 }, (_, i) => (
        <motion.div key={i} style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: '#F5C518', left: `${28 + i * 5}%`, top: '55%' }}
          animate={{ y: [0, -90], opacity: [0, 1, 0], scale: [0, 1.8, 0] }}
          transition={{ duration: 2.2, delay: i * 0.22, repeat: Infinity, repeatDelay: 0.8 }} />
      ))}
      {/* bottom text */}
      <motion.div style={{ position: 'absolute', bottom: '7%', textAlign: 'center' }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 7, times: [0, 0.15, 0.85, 1], repeat: Infinity }}>
        <div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#a855f7', fontSize: 'clamp(1.5rem,4.5vw,2.8rem)', letterSpacing: '0.1em' }}>1200+ CARTES COLLECTIBLES</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.22em', marginTop: 3 }}>COMMON · RARE · EPIC · LÉGENDAIRE</div>
      </motion.div>
    </div>
  )
}

// ─── Scene 3: Battle ──────────────────────────────────────────────────────────

function BattleScene() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'hidden', background: 'radial-gradient(ellipse 70% 70% at 50% 50%,#2a0808 0%,#091524 100%)' }}>
      {/* spark lines */}
      {Array.from({ length: 7 }, (_, i) => (
        <motion.div key={i} style={{ position: 'absolute', width: 1.5, height: `${24 + i * 8}px`, background: 'rgba(245,197,24,0.55)', left: `${34 + i * 5}%`, top: '42%', transform: `rotate(${-8 + i * 3}deg)` }}
          animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 0] }}
          transition={{ duration: 0.25, delay: i * 0.18 + 0.5, repeat: Infinity, repeatDelay: 3 }} />
      ))}
      {/* cards row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 2 }}>
        {/* left: winner */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
          <motion.div initial={{ x: -220, opacity: 0 }} animate={{ x: [null, 0], opacity: [null, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4.5 }}>
            <motion.div
              animate={{ boxShadow: ['0 0 20px rgba(245,197,24,0.3)', '0 0 50px rgba(245,197,24,0.78)', '0 0 20px rgba(245,197,24,0.3)'], scale: [1, 1.07, 1] }}
              transition={{ duration: 1.4, delay: 2, repeat: Infinity, repeatDelay: 3.5 }}>
              <Card rarity="legendary" flag="🇫🇷" name="MBAPPÉ" stat={97} statLabel="VITESSE" size="lg" />
            </motion.div>
          </motion.div>
          <div style={{ width: 130, height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', background: 'linear-gradient(90deg,#F5C518,#ffd700)', borderRadius: 6 }}
              initial={{ width: '0%' }} animate={{ width: '97%' }}
              transition={{ duration: 0.9, delay: 1.5, repeat: Infinity, repeatDelay: 4 }} />
          </div>
          <div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#F5C518', fontSize: 11, letterSpacing: '0.1em' }}>97 VITESSE</div>
        </div>
        {/* VS */}
        <motion.div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#C8102E', fontSize: 28, letterSpacing: '0.12em', textShadow: '0 0 18px rgba(200,16,46,0.7)' }}
          animate={{ scale: [1, 1.22, 1], opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 1, repeat: Infinity }}>VS</motion.div>
        {/* right: loser */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
          <motion.div initial={{ x: 220, opacity: 0 }} animate={{ x: [null, 0], opacity: [null, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4.5 }}>
            <motion.div animate={{ opacity: [1, 1, 0.35] }}
              transition={{ duration: 0.8, delay: 2.8, repeat: Infinity, repeatDelay: 4 }}>
              <Card rarity="epic" flag="🇧🇷" name="VINICIUS" stat={85} statLabel="VITESSE" size="lg" />
            </motion.div>
          </motion.div>
          <div style={{ width: 130, height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', background: 'linear-gradient(90deg,#9333ea,#a855f7)', borderRadius: 6 }}
              initial={{ width: '0%' }} animate={{ width: '85%' }}
              transition={{ duration: 0.9, delay: 1.5, repeat: Infinity, repeatDelay: 4 }} />
          </div>
          <div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#a855f7', fontSize: 11, letterSpacing: '0.1em' }}>85 VITESSE</div>
        </div>
      </div>
      {/* victory badge */}
      <motion.div style={{ position: 'absolute', top: '18%', left: '15%', background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.4)', borderRadius: 8, padding: '4px 14px', zIndex: 3 }}
        animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.7, 0.7, 1, 1, 0.7] }}
        transition={{ duration: 4.5, times: [0, 0.5, 0.6, 0.9, 1], repeat: Infinity, repeatDelay: 0.5 }}>
        <span style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#F5C518', fontSize: 14, letterSpacing: '0.1em' }}>⚡ VICTOIRE</span>
      </motion.div>
      {/* bottom text */}
      <motion.div style={{ position: 'absolute', bottom: '7%', textAlign: 'center' }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 6, times: [0, 0.18, 0.82, 1], repeat: Infinity }}>
        <div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#C8102E', fontSize: 'clamp(1.5rem,4.5vw,2.8rem)', letterSpacing: '0.1em', textShadow: '0 0 16px rgba(200,16,46,0.4)' }}>DÉFIE TES AMIS EN BATTLE</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.22em', marginTop: 3 }}>LA MEILLEURE STAT L'EMPORTE</div>
      </motion.div>
    </div>
  )
}

// ─── Scene 4: League ──────────────────────────────────────────────────────────

const ENTRIES = [
  { rank: 1, name: 'KAISER_VII',  coins: 2450, flag: '🇩🇪', you: false },
  { rank: 2, name: 'TOI',         coins: 2180, flag: '🇫🇷', you: true  },
  { rank: 3, name: 'SAMURAI_X',   coins: 1960, flag: '🇯🇵', you: false },
  { rank: 4, name: 'GAUCHO99',    coins: 1740, flag: '🇧🇷', you: false },
  { rank: 5, name: 'LIONHEART',   coins: 1520, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', you: false },
]

function LeagueScene() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'hidden', background: 'radial-gradient(ellipse 70% 70% at 50% 50%,#0a1f3d 0%,#091524 100%)' }}>
      <motion.div style={{ textAlign: 'center', marginBottom: 4 }}
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 8 }}>
        <div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#009ADE', fontSize: 'clamp(1.1rem,3vw,1.8rem)', letterSpacing: '0.16em' }}>🏆 LIGUE DES POTES</div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.2em', marginTop: 2 }}>COUPE DU MONDE 2026</div>
      </motion.div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 'min(320px,88vw)' }}>
        {ENTRIES.map((e, i) => (
          <motion.div key={i}
            initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.3 + i * 0.12, repeat: Infinity, repeatDelay: 7.5 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, background: e.you ? 'rgba(0,154,222,0.1)' : 'rgba(255,255,255,0.025)', border: e.you ? '1.5px solid rgba(0,154,222,0.38)' : '1px solid rgba(255,255,255,0.05)', boxShadow: e.rank === 1 ? '0 0 14px rgba(245,197,24,0.12)' : 'none' }}>
            <div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 15, color: e.rank === 1 ? '#F5C518' : e.rank === 2 ? '#9ca3af' : e.rank === 3 ? '#b87333' : 'rgba(255,255,255,0.28)', width: 22, textAlign: 'center', flexShrink: 0 }}>
              {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: e.you ? 'rgba(0,154,222,0.18)' : 'rgba(255,255,255,0.06)', border: e.you ? '1.5px solid rgba(0,154,222,0.45)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
              {e.flag}
            </div>
            <div style={{ flex: 1, fontFamily: 'Bebas Neue,sans-serif', fontSize: 12, letterSpacing: '0.08em', color: e.you ? '#009ADE' : 'rgba(255,255,255,0.75)' }}>
              {e.name}{e.you && <span style={{ fontSize: 8, color: 'rgba(0,154,222,0.5)', marginLeft: 5 }}>TOI</span>}
            </div>
            <motion.div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 13, color: '#F5C518', letterSpacing: '0.05em' }}
              animate={{ opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 1.8, delay: i * 0.3, repeat: Infinity }}>
              {e.coins.toLocaleString()} 🪙
            </motion.div>
          </motion.div>
        ))}
      </div>
      {/* bottom text */}
      <motion.div style={{ position: 'absolute', bottom: '7%', textAlign: 'center' }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 9, times: [0, 0.12, 0.88, 1], repeat: Infinity }}>
        <div style={{ fontFamily: 'Bebas Neue,sans-serif', color: '#009ADE', fontSize: 'clamp(1.5rem,4.5vw,2.8rem)', letterSpacing: '0.1em' }}>REJOINS TA LIGUE PRIVÉE</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.22em', marginTop: 3 }}>CLASSEMENT EN TEMPS RÉEL</div>
      </motion.div>
    </div>
  )
}

// ─── Scene router ─────────────────────────────────────────────────────────────

function Scene({ id }: { id: SceneId }) {
  if (id === 'pack')   return <PackScene />
  if (id === 'cards')  return <CardsScene />
  if (id === 'battle') return <BattleScene />
  return <LeagueScene />
}

// ─── Scene metadata ───────────────────────────────────────────────────────────

const SCENES = [
  { id: 'pack'   as SceneId, title: 'Ouverture de Pack',   accent: '#F5C518', description: "Pack qui shake, cartes qui s'envolent, révélation Légendaire en or",                  quote: '"Tu ouvres des packs pour débloquer les meilleurs joueurs..."' },
  { id: 'cards'  as SceneId, title: 'Collection de Cartes', accent: '#a855f7', description: 'Grille de cartes avec stagger, zoom Légendaire et particules dorées',                  quote: '"Mbappé, Messi, Vinicius, Bellingham — leurs vraies photos..."' },
  { id: 'battle' as SceneId, title: 'Battle',               accent: '#C8102E', description: '2 cartes face à face, barres de stats comparées, badge victoire',                      quote: '"Ta carte contre la leur. La meilleure stat l\'emporte."' },
  { id: 'league' as SceneId, title: 'Ligue Privée',         accent: '#009ADE', description: 'Classement entre amis animé, pièces qui brillent, ta position mise en avant',         quote: '"Tu rejoins une ligue privée avec tes amis..."' },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function ScenesClient() {
  const [fullscreen, setFullscreen] = useState<SceneId | null>(null)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <Link href="/admin/pub" className="flex items-center gap-1.5 text-white/25 hover:text-white/50 transition-colors text-xs mb-6 w-fit">
          <ArrowLeft size={13} /> Espace Pub
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#C8102E]/15 flex items-center justify-center flex-shrink-0">
            <Film size={20} className="text-[#C8102E]" />
          </div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>SÉQUENCES VIDÉO</h1>
        </div>
        <p className="text-white/30 text-sm">4 animations B-roll prêtes à l'emploi. Ouvre en plein écran → screen record → coupe dans le montage.</p>
      </div>

      {/* How to */}
      <div className="glass rounded-2xl p-4 border border-white/5">
        <p className="text-white/40 text-xs leading-relaxed">
          <span className="text-white/60 font-semibold">Mode d'emploi :</span>{' '}
          clique <span className="text-[#F5C518] font-semibold">PLEIN ÉCRAN</span> sur la scène souhaitée → démarre ton enregistrement d'écran (iOS/Android natif ou OBS sur PC) → laisse boucler 10-15 secondes → dans ton logiciel de montage, coupe le meilleur moment. Chaque scène boucle en automatique.
        </p>
      </div>

      {/* Grid 2×2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {SCENES.map((scene) => (
          <div key={scene.id} className="glass rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors">
            {/* Live preview */}
            <div className="relative h-44 overflow-hidden cursor-pointer group" onClick={() => setFullscreen(scene.id)}>
              <Scene id={scene.id} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                  <Maximize2 size={18} className="text-white" />
                </div>
              </div>
            </div>
            {/* Info */}
            <div className="p-4">
              <h3 className="font-black text-white text-lg leading-tight mb-0.5" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>{scene.title}</h3>
              <p className="text-white/35 text-xs mb-2 leading-relaxed">{scene.description}</p>
              <p className="text-white/18 text-xs italic mb-3 line-clamp-1">{scene.quote}</p>
              <button
                onClick={() => setFullscreen(scene.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: `${scene.accent}18`, border: `1px solid ${scene.accent}40`, color: scene.accent, fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.08em' }}
              >
                <Maximize2 size={13} /> PLEIN ÉCRAN
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            style={{ background: '#091524' }}
          >
            <Scene id={fullscreen} />
            <button
              onClick={() => setFullscreen(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
