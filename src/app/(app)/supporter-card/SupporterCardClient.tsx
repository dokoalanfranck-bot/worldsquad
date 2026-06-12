'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, Download, Share2, Camera, RefreshCw } from 'lucide-react'
import { ShareSheet } from '@/components/ShareSheet'
import toast from 'react-hot-toast'
import { NATIONS_2026 } from '@/types'
import type { User } from '@/types'

interface Props {
  user: User
  cardCount: number
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

async function generateCard(
  pseudo: string,
  nation: string,
  flag: string,
  preds: number,
  wins: number,
  cards: number,
  streak: number,
  photoSrc: string | null
): Promise<Blob> {
  const W = 600, H = 900
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#0A0A0F')
  grad.addColorStop(0.5, '#13131f')
  grad.addColorStop(1, '#0c0c1a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Subtle circle bg
  const radGrad = ctx.createRadialGradient(W / 2, 300, 0, W / 2, 300, 300)
  radGrad.addColorStop(0, 'rgba(245, 197, 24, 0.05)')
  radGrad.addColorStop(1, 'rgba(245, 197, 24, 0)')
  ctx.fillStyle = radGrad
  ctx.fillRect(0, 0, W, H)

  // Top gold bar
  ctx.fillStyle = '#F5C518'
  ctx.fillRect(0, 0, W, 6)

  // WorldSquad brand
  ctx.font = 'bold 13px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '3px'
  ctx.fillText('⚽  WORLDSQUAD 2026', W / 2, 44)

  // Flag emoji
  ctx.font = '90px sans-serif'
  ctx.letterSpacing = '0px'
  ctx.fillText(flag, W / 2, 165)

  // User photo or initials circle
  const PHOTO_Y = 215
  const PHOTO_R = 70
  ctx.save()
  ctx.beginPath()
  ctx.arc(W / 2, PHOTO_Y + PHOTO_R, PHOTO_R, 0, Math.PI * 2)
  ctx.clip()

  if (photoSrc) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject()
        img.src = photoSrc
      })
      ctx.drawImage(img, W / 2 - PHOTO_R, PHOTO_Y, PHOTO_R * 2, PHOTO_R * 2)
    } catch {
      // fallback to initials
      ctx.fillStyle = '#1c1c30'
      ctx.fillRect(W / 2 - PHOTO_R, PHOTO_Y, PHOTO_R * 2, PHOTO_R * 2)
      ctx.font = `bold ${PHOTO_R}px sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.textAlign = 'center'
      ctx.fillText(pseudo.slice(0, 2).toUpperCase(), W / 2, PHOTO_Y + PHOTO_R + PHOTO_R * 0.35)
    }
  } else {
    ctx.fillStyle = '#1c1c30'
    ctx.fillRect(W / 2 - PHOTO_R, PHOTO_Y, PHOTO_R * 2, PHOTO_R * 2)
    ctx.font = `bold ${PHOTO_R}px sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.textAlign = 'center'
    ctx.fillText(pseudo.slice(0, 2).toUpperCase(), W / 2, PHOTO_Y + PHOTO_R + PHOTO_R * 0.35)
  }
  ctx.restore()

  // Photo border
  ctx.strokeStyle = '#F5C518'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(W / 2, PHOTO_Y + PHOTO_R, PHOTO_R + 3, 0, Math.PI * 2)
  ctx.stroke()

  // Pseudo
  ctx.font = 'bold 44px sans-serif'
  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '-1px'
  ctx.fillText(pseudo.toUpperCase(), W / 2, 430)

  // Nation supporter label
  ctx.font = 'bold 14px sans-serif'
  ctx.fillStyle = '#F5C518'
  ctx.letterSpacing = '4px'
  ctx.fillText(`SUPPORTER · ${nation.toUpperCase()}`, W / 2, 462)

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(100, 490)
  ctx.lineTo(W - 100, 490)
  ctx.stroke()

  // Stats grid
  const stats = [
    { emoji: '🎯', value: preds, label: 'PRONOS' },
    { emoji: '⚔️', value: wins, label: 'VICTOIRES' },
    { emoji: '🃏', value: cards, label: 'CARTES' },
    { emoji: '🔥', value: streak, label: 'SÉRIE' },
  ]
  const cellW = (W - 80) / 4
  const statsY = 510
  const statsH = 110

  stats.forEach((stat, i) => {
    const x = 40 + i * cellW
    // cell bg
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent'
    drawRoundedRect(ctx, x, statsY, cellW, statsH, 0)
    ctx.fill()

    // emoji
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'center'
    ctx.letterSpacing = '0px'
    ctx.fillText(stat.emoji, x + cellW / 2, statsY + 34)

    // value
    ctx.font = 'bold 36px sans-serif'
    ctx.fillStyle = '#F5C518'
    ctx.letterSpacing = '-1px'
    ctx.fillText(String(stat.value), x + cellW / 2, statsY + 72)

    // label
    ctx.font = 'bold 10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.letterSpacing = '1px'
    ctx.fillText(stat.label, x + cellW / 2, statsY + 92)

    // right border
    if (i < 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + cellW, statsY + 10)
      ctx.lineTo(x + cellW, statsY + statsH - 10)
      ctx.stroke()
    }
  })

  // Outer stats border
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  drawRoundedRect(ctx, 40, statsY, W - 80, statsH, 12)
  ctx.stroke()

  // CTA button
  ctx.fillStyle = '#F5C518'
  drawRoundedRect(ctx, W / 2 - 160, 660, 320, 52, 26)
  ctx.fill()
  ctx.font = 'bold 16px sans-serif'
  ctx.fillStyle = '#000'
  ctx.letterSpacing = '1px'
  ctx.fillText('🌍 Rejoins WorldSquad', W / 2, 692)

  // Footer
  ctx.font = '13px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.letterSpacing = '1px'
  ctx.fillText('worldsquad.vercel.app', W / 2, H - 28)

  // Bottom gold bar
  ctx.fillStyle = '#F5C518'
  ctx.fillRect(0, H - 4, W, 4)

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
}

// ── Card preview component ───────────────────────────────────────────────────

function CardPreview({
  pseudo, nation, flag, preds, wins, cards, streak, photoSrc,
}: {
  pseudo: string; nation: string; flag: string
  preds: number; wins: number; cards: number; streak: number
  photoSrc: string | null
}) {
  return (
    <div className="relative w-[260px] mx-auto select-none" style={{ aspectRatio: '600/900' }}>
      <div className="rounded-3xl overflow-hidden border border-[#F5C518]/20 w-full h-full flex flex-col"
        style={{ background: 'linear-gradient(160deg, #0A0A0F 0%, #13131f 60%, #0c0c1a 100%)' }}>
        {/* gold top */}
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #F5C518, #ffd700, #F5C518)' }} />

        <div className="flex-1 flex flex-col items-center px-4 py-3">
          {/* brand */}
          <p className="text-[9px] font-bold text-white/25 tracking-[3px] mt-1">⚽ WORLDSQUAD 2026</p>

          {/* flag */}
          <div className="text-[52px] leading-none mt-2">{flag}</div>

          {/* photo */}
          <div className="relative mt-2">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-[#F5C518]">
              {photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoSrc} alt="photo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1c1c30] flex items-center justify-center text-white/50 font-black text-lg">
                  {pseudo.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* pseudo */}
          <p className="text-white font-black text-[18px] tracking-tight mt-2 leading-none">{pseudo.toUpperCase()}</p>
          <p className="text-[#F5C518] text-[9px] font-bold tracking-[3px] mt-1">SUPPORTER · {nation.toUpperCase()}</p>

          {/* divider */}
          <div className="w-[80px] h-px bg-white/8 mt-2" />

          {/* stats */}
          <div className="grid grid-cols-4 w-full mt-2 border border-white/8 rounded-xl overflow-hidden">
            {[
              { e: '🎯', v: preds, l: 'PRONOS' },
              { e: '⚔️', v: wins, l: 'WIN' },
              { e: '🃏', v: cards, l: 'CARTES' },
              { e: '🔥', v: streak, l: 'SÉRIE' },
            ].map((s, i) => (
              <div key={i} className={`flex flex-col items-center py-2 ${i < 3 ? 'border-r border-white/6' : ''} ${i % 2 === 0 ? 'bg-white/2' : ''}`}>
                <span className="text-[14px] leading-none">{s.e}</span>
                <span className="text-[#F5C518] font-black text-[14px] leading-none mt-0.5">{s.v}</span>
                <span className="text-white/25 text-[7px] tracking-wide mt-0.5">{s.l}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-3 bg-[#F5C518] rounded-full px-4 py-1.5 text-black font-black text-[10px] tracking-wide">
            🌍 Rejoins WorldSquad
          </div>

          {/* footer */}
          <p className="text-white/15 text-[8px] tracking-wide mt-auto mb-1">worldsquad.vercel.app</p>
        </div>

        {/* gold bottom */}
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #F5C518, #ffd700, #F5C518)' }} />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function SupporterCardClient({ user, cardCount }: Props) {
  const [photoSrc, setPhotoSrc] = useState<string | null>(user.photo_url)
  const [downloading, setDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nation = NATIONS_2026.find((n) => n.name === user.nation)
  const flag = nation?.flag ?? '🌍'

  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo trop lourde (max 5 MB)'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const download = useCallback(async () => {
    setDownloading(true)
    try {
      const blob = await generateCard(
        user.pseudo, user.nation, flag,
        user.predictions_correct, user.battles_won,
        cardCount, user.daily_streak, photoSrc
      )
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `worldsquad-${user.pseudo}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Carte téléchargée !')
    } catch {
      toast.error('Erreur lors de la génération')
    } finally {
      setDownloading(false)
    }
  }, [user, flag, photoSrc, cardCount])

  const shareCard = useCallback(async () => {
    if (!navigator.share) { toast('Utilise le bouton "Télécharger" puis partage l\'image', { icon: 'ℹ️' }); return }
    setDownloading(true)
    try {
      const blob = await generateCard(
        user.pseudo, user.nation, flag,
        user.predictions_correct, user.battles_won,
        cardCount, user.daily_streak, photoSrc
      )
      const file = new File([blob], `worldsquad-${user.pseudo}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ma carte supporter WorldSquad 2026`,
          text: `Je supporte ${user.nation} à la Coupe du Monde 2026 ! Rejoins-moi sur WorldSquad ⚽`,
        })
      } else {
        // fallback: download
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `worldsquad-${user.pseudo}.png`
        a.click()
        toast.success('Image téléchargée — partage-la sur tes réseaux !')
      }
    } catch {
      // user cancelled or error
    } finally {
      setDownloading(false)
    }
  }, [user, flag, photoSrc, cardCount])

  const ogImageUrl = `/api/og?type=supporter&pseudo=${encodeURIComponent(user.pseudo)}&nation=${encodeURIComponent(user.nation)}&flag=${encodeURIComponent(flag)}&preds=${user.predictions_correct}&wins=${user.battles_won}&cards=${cardCount}&streak=${user.daily_streak}`

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://worldsquad.vercel.app'}/supporter?user=${user.id}`

  return (
    <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          🎴 MA CARTE SUPPORTER
        </h1>
        <p className="text-white/40 text-sm">
          Génère ta carte officielle et partage-la sur tes réseaux
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Card preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-shrink-0 w-full lg:w-auto flex justify-center"
        >
          <CardPreview
            pseudo={user.pseudo}
            nation={user.nation}
            flag={flag}
            preds={user.predictions_correct}
            wins={user.battles_won}
            cards={cardCount}
            streak={user.daily_streak}
            photoSrc={photoSrc}
          />
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 space-y-4 w-full"
        >
          {/* Photo */}
          <div className="glass rounded-2xl p-5 border border-white/5">
            <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <Camera size={14} className="text-[#F5C518]" />
              Ta photo
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhoto}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-semibold"
              >
                <Upload size={14} />
                {photoSrc ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              {photoSrc && photoSrc !== user.photo_url && (
                <button
                  onClick={() => setPhotoSrc(user.photo_url)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                  title="Réinitialiser"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            <p className="text-white/25 text-xs mt-2">JPG, PNG, WebP · Max 5 MB</p>
          </div>

          {/* Stats recap */}
          <div className="glass rounded-2xl p-5 border border-white/5">
            <p className="text-white font-bold text-sm mb-3">Tes stats sur la carte</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Pronostics corrects', value: user.predictions_correct, emoji: '🎯' },
                { label: 'Battles gagnés', value: user.battles_won, emoji: '⚔️' },
                { label: 'Cartes collectées', value: cardCount, emoji: '🃏' },
                { label: 'Série quotidienne', value: user.daily_streak, emoji: '🔥' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 p-2 rounded-lg bg-white/3">
                  <span>{s.emoji}</span>
                  <div>
                    <p className="text-[#F5C518] font-black text-sm leading-none">{s.value}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              onClick={download}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-black text-sm transition-all disabled:opacity-50 hover:brightness-110"
              style={{ background: '#F5C518', fontFamily: 'Bebas Neue, sans-serif', fontSize: '16px' }}
            >
              {downloading ? (
                <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> GÉNÉRATION…</>
              ) : (
                <><Download size={16} /> TÉLÉCHARGER MA CARTE</>
              )}
            </button>

            <button
              onClick={shareCard}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm border border-[#F5C518]/30 text-[#F5C518] bg-[#F5C518]/8 hover:bg-[#F5C518]/15 transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '16px' }}
            >
              <Share2 size={16} />
              PARTAGER MA CARTE
            </button>

            <div className="border-t border-white/5 pt-2.5">
              <p className="text-white/30 text-xs mb-2">Partager le lien de ta carte :</p>
              <ShareSheet
                url={ogImageUrl}
                title={`${user.pseudo} supporte ${user.nation} à la Coupe du Monde 2026 sur WorldSquad ! ⚽`}
                text={`Rejoins-moi sur WorldSquad et vis la FIFA World Cup 2026 comme jamais`}
                imageUrl={ogImageUrl}
                label="Partager le lien"
                variant="outline"
                className="w-full"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
