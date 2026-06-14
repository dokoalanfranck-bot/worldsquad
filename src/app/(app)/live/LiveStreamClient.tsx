'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tv2, RefreshCw } from 'lucide-react'

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

interface Props {
  isActive: boolean
  youtubeUrl: string | null
  title: string
  subtitle: string | null
}

export function LiveStreamClient({ isActive, youtubeUrl, title, subtitle }: Props) {
  const router = useRouter()
  const videoId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null

  const refresh = useCallback(() => router.refresh(), [router])

  // Quand pas de live, on vérifie toutes les 60s au cas où l'admin l'active
  useEffect(() => {
    if (isActive && videoId) return
    const t = setInterval(refresh, 60000)
    return () => clearInterval(t)
  }, [refresh, isActive, videoId])

  if (!isActive || !videoId) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 pb-32">
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

  return (
    <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto pb-32">

      {/* Header */}
      <div className="mb-5">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">WorldSquad</p>
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
            {subtitle && (
              <p className="text-white/50 text-base mt-1">{subtitle}</p>
            )}
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

      {/* YouTube Player (16:9) */}
      <div
        className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/8"
        style={{ paddingBottom: '56.25%' }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          title={title}
        />
      </div>

      {/* Footer info */}
      <div className="mt-4 flex items-center justify-between text-xs text-white/20">
        <span>Diffusé sur <span className="text-white/35">WorldSquad</span></span>
        <span>Le stream est géré par l'équipe WorldSquad</span>
      </div>
    </div>
  )
}
