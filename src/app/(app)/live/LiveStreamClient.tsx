'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tv2, RefreshCw, Play } from 'lucide-react'

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

// ── Countdown ──────────────────────────────────────────────────────────────────
function calcTimeLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return null
  const totalSec = Math.floor(diff / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return { d, h, m, s }
}

function CountdownScreen({
  startsAt, title, subtitle, thumbnailUrl, refresh,
}: {
  startsAt: string
  title: string
  subtitle: string | null
  thumbnailUrl: string | null
  refresh: () => void
}) {
  const [tl, setTl] = useState(() => calcTimeLeft(startsAt))
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      const next = calcTimeLeft(startsAt)
      setTl(next)
      if (!next) { setExpired(true); clearInterval(t) }
    }, 1000)
    return () => clearInterval(t)
  }, [startsAt])

  useEffect(() => {
    if (!expired) return
    const t = setInterval(refresh, 30000)
    return () => clearInterval(t)
  }, [expired, refresh])

  const pad = (n: number) => String(n).padStart(2, '0')

  const units = tl
    ? ([...(tl.d > 0 ? [{ v: pad(tl.d), label: 'JOURS' }] : []),
        { v: pad(tl.h), label: 'HRS' },
        { v: pad(tl.m), label: 'MIN' },
        { v: pad(tl.s), label: 'SEC' },
      ] as { v: string; label: string }[])
    : []

  return (
    <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto pb-32">
      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">WorldSquad · Match en Direct</p>
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-white/8"
        style={{ paddingBottom: '56.25%' }}
      >
        {/* Background thumbnail */}
        {thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-105 blur-sm"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
          {expired ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                <p className="text-white/70 text-sm font-bold">Match sur le point de commencer...</p>
              </div>
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white/55 hover:text-white/80 text-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualiser
              </button>
            </>
          ) : (
            <>
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em]">DÉBUT DANS</p>

              {/* Digit blocks */}
              <div className="flex items-end gap-2 lg:gap-4">
                {units.map(({ v, label }, i) => (
                  <div key={label} className="flex items-end gap-2 lg:gap-4">
                    {i > 0 && <span className="text-white/20 text-2xl lg:text-4xl font-black mb-1 leading-none" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>:</span>}
                    <div className="flex flex-col items-center">
                      <div className="bg-white/8 border border-white/10 rounded-xl px-3 py-2 lg:px-5 lg:py-3">
                        <span
                          className="text-3xl lg:text-5xl font-black text-white tabular-nums leading-none"
                          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                        >
                          {v}
                        </span>
                      </div>
                      <span className="text-white/30 text-[9px] font-bold mt-1.5 tracking-widest">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Match info */}
              <div className="text-center mt-1">
                <h1
                  className="text-2xl lg:text-4xl font-black text-white leading-tight"
                  style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-white/45 text-sm mt-1">{subtitle}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Jitsi viewer ───────────────────────────────────────────────────────────────
function JitsiViewer({ roomName, title, thumbnailUrl }: { roomName: string; title: string; thumbnailUrl: string | null }) {
  const [joined, setJoined] = useState(false)

  if (!joined) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
        {thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-105 blur-sm"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/50" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-400 text-[11px] font-bold tracking-widest">EN DIRECT</span>
          </div>
          <p className="text-white/70 text-sm text-center max-w-xs">{title}</p>
          <button
            onClick={() => setJoined(true)}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition-all hover:scale-105 active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
            <span className="text-white font-bold text-sm">Regarder le live</span>
          </button>
          <p className="text-white/20 text-xs">Partage d&apos;écran en temps réel</p>
        </div>
      </div>
    )
  }

  // Direct iframe — most reliable way to embed Jitsi with auto-join
  return (
    <iframe
      src={`https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.disableDeepLinking=true&config.startSilent=true`}
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      allowFullScreen
      className="absolute inset-0 w-full h-full"
      title={title}
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  isActive: boolean
  youtubeUrl: string | null
  title: string
  subtitle: string | null
  streamType: 'jitsi' | 'youtube'
  roomName: string | null
  thumbnailUrl: string | null
  startsAt: string | null
}

export function LiveStreamClient({ isActive, youtubeUrl, title, subtitle, streamType, roomName, thumbnailUrl, startsAt }: Props) {
  const router = useRouter()
  const videoId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null
  const isReady = isActive && (streamType === 'jitsi' ? !!roomName : !!videoId)

  const refresh = useCallback(() => router.refresh(), [router])

  // Auto-refresh quand en attente (pas de compte à rebours)
  useEffect(() => {
    if (isReady) return
    const hasCountdown = startsAt && new Date(startsAt) > new Date()
    if (hasCountdown) return // le CountdownScreen gère lui-même son refresh
    const t = setInterval(refresh, 60000)
    return () => clearInterval(t)
  }, [refresh, isReady, startsAt])

  // Stream actif → player
  if (isReady) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto pb-32">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">WorldSquad</p>
        <div className="mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-red-400 text-[11px] font-bold tracking-widest">EN DIRECT</span>
                </div>
              </div>
              <h1
                className="text-4xl lg:text-5xl font-black text-white leading-none"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {title}
              </h1>
              {subtitle && <p className="text-white/50 text-base mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={refresh}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-white/30 hover:text-white/55 text-xs transition-colors mt-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>

        <div
          className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/8"
          style={{ paddingBottom: '56.25%' }}
        >
          {streamType === 'jitsi' && roomName ? (
            <JitsiViewer roomName={roomName} title={title} thumbnailUrl={thumbnailUrl} />
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              title={title}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-white/20">
          <span>Diffusé sur <span className="text-white/35">WorldSquad</span></span>
          <span>Le stream est géré par l&apos;équipe WorldSquad</span>
        </div>
      </div>
    )
  }

  // Compte à rebours → si starts_at est dans le futur
  if (startsAt && new Date(startsAt) > new Date()) {
    return (
      <CountdownScreen
        startsAt={startsAt}
        title={title}
        subtitle={subtitle}
        thumbnailUrl={thumbnailUrl}
        refresh={refresh}
      />
    )
  }

  // État vide
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 pb-32">
      {thumbnailUrl && (
        <div
          className="w-full max-w-xs rounded-2xl overflow-hidden border border-white/8 mb-6"
          style={{ paddingBottom: '28%' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      )}
      <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/8 flex items-center justify-center mb-6">
        <Tv2 className="w-9 h-9 text-white/20" />
      </div>
      <h2
        className="text-white font-black text-3xl mb-2 text-center"
        style={{ fontFamily: 'Bebas Neue, sans-serif' }}
      >
        AUCUN MATCH EN DIRECT
      </h2>
      <p className="text-white/30 text-sm text-center max-w-xs leading-relaxed">
        Les lives seront disponibles ici lors des matchs importants.
        <br />
        Reviens pendant un match !
      </p>
      <button
        onClick={refresh}
        className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-white/35 hover:text-white/60 text-sm transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Actualiser
      </button>
    </div>
  )
}
