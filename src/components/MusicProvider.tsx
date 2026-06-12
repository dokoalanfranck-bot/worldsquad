'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Music, VolumeX } from 'lucide-react'

interface Track { id: string; name: string; url: string }

interface MusicContextValue {
  musicEnabled: boolean
  setMusicEnabled: (v: boolean) => void
  muted: boolean
  setMuted: (v: boolean) => void
  volume: number
  setVolume: (v: number) => void
  playPackOpening: () => void
  stopPackOpening: () => void
  isPlaying: boolean
  currentTrackName: string
}

const MusicContext = createContext<MusicContextValue>({
  musicEnabled: true,
  setMusicEnabled: () => {},
  muted: false,
  setMuted: () => {},
  volume: 0.5,
  setVolume: () => {},
  playPackOpening: () => {},
  stopPackOpening: () => {},
  isPlaying: false,
  currentTrackName: '',
})

export function useMusicContext() {
  return useContext(MusicContext)
}

const LS_ENABLED = 'ws_music_enabled'
const LS_MUTED = 'ws_music_muted'
const LS_VOLUME = 'ws_music_volume'

function proxyUrl(id: string) {
  return `/api/music/stream/${id}`
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [ambiance, setAmbiance] = useState<Track | null>(null)
  const [packTrack, setPackTrack] = useState<Track | null>(null)
  const [musicEnabled, setMusicEnabledState] = useState(true)
  const [muted, setMutedState] = useState(false)
  const [volume, setVolumeState] = useState(0.5)
  const [isPlaying, setIsPlaying] = useState(false)
  const [packPlaying, setPackPlaying] = useState(false)
  const [currentTrackName, setCurrentTrackName] = useState('')
  const [hasInteracted, setHasInteracted] = useState(false)
  const [hasTracks, setHasTracks] = useState(false)

  const ambianceRef = useRef<HTMLAudioElement | null>(null)
  const packRef = useRef<HTMLAudioElement | null>(null)
  const playInitiated = useRef(false)

  // Charger les pistes actives
  useEffect(() => {
    fetch('/api/music/active')
      .then((r) => r.json())
      .then((d) => {
        const a = d.ambiance ?? null
        const p = d.pack_opening ?? null
        setAmbiance(a)
        setPackTrack(p)
        if (a || p) setHasTracks(true)
        if (a) setCurrentTrackName(a.name)
      })
      .catch(() => {})
  }, [])

  // Charger les préférences depuis localStorage
  useEffect(() => {
    const enabled = localStorage.getItem(LS_ENABLED)
    const mut = localStorage.getItem(LS_MUTED)
    const vol = localStorage.getItem(LS_VOLUME)
    if (enabled !== null) setMusicEnabledState(enabled !== 'false')
    if (mut !== null) setMutedState(mut === 'true')
    if (vol !== null) setVolumeState(parseFloat(vol) || 0.5)
  }, [])

  const startAmbiance = useCallback(() => {
    const audio = ambianceRef.current
    if (!audio || !ambiance) return
    const src = proxyUrl(ambiance.id)
    if (audio.src !== src && !audio.src.endsWith(ambiance.id)) {
      audio.src = src
      audio.loop = true
    }
    audio.volume = muted ? 0 : volume
    audio.play()
      .then(() => {
        setIsPlaying(true)
        setCurrentTrackName(ambiance.name)
      })
      .catch(() => {})
  }, [ambiance, muted, volume])

  // Auto-play sur première interaction (click ou touch)
  useEffect(() => {
    if (!ambiance || !musicEnabled || playInitiated.current) return

    const onInteraction = () => {
      if (playInitiated.current) return
      playInitiated.current = true
      setHasInteracted(true)
      startAmbiance()
    }

    window.addEventListener('click', onInteraction, { once: true })
    window.addEventListener('touchstart', onInteraction, { once: true, passive: true })

    return () => {
      window.removeEventListener('click', onInteraction)
      window.removeEventListener('touchstart', onInteraction)
    }
  }, [ambiance, musicEnabled, startAmbiance])

  // Sync volume/mute sur les éléments audio
  useEffect(() => {
    const amb = ambianceRef.current
    if (amb) amb.volume = muted ? 0 : volume
  }, [volume, muted])

  // Pack track terminé → reprendre ambiance
  useEffect(() => {
    const pack = packRef.current
    if (!pack) return
    const onEnded = () => {
      setPackPlaying(false)
      if (hasInteracted && musicEnabled) startAmbiance()
    }
    pack.addEventListener('ended', onEnded)
    return () => pack.removeEventListener('ended', onEnded)
  }, [hasInteracted, musicEnabled, startAmbiance])

  // ── API exposée ────────────────────────────────────────────────────────────

  function setMusicEnabled(v: boolean) {
    setMusicEnabledState(v)
    localStorage.setItem(LS_ENABLED, String(v))
    if (!v) {
      ambianceRef.current?.pause()
      packRef.current?.pause()
      setIsPlaying(false)
      setPackPlaying(false)
      playInitiated.current = false
    } else if (hasInteracted) {
      startAmbiance()
    } else {
      // Remettre le listener de première interaction
      playInitiated.current = false
    }
  }

  function setMuted(v: boolean) {
    setMutedState(v)
    localStorage.setItem(LS_MUTED, String(v))
    const amb = ambianceRef.current
    const pack = packRef.current
    if (amb) amb.volume = v ? 0 : volume
    if (pack) pack.volume = v ? 0 : Math.min(volume * 1.2, 1)
  }

  function setVolume(v: number) {
    setVolumeState(v)
    localStorage.setItem(LS_VOLUME, String(v))
    const amb = ambianceRef.current
    if (amb) amb.volume = muted ? 0 : v
  }

  const playPackOpening = useCallback(() => {
    if (!packTrack || !hasInteracted || !musicEnabled) return
    const pack = packRef.current
    const amb = ambianceRef.current
    if (amb) amb.pause()
    if (pack) {
      pack.src = proxyUrl(packTrack.id)
      pack.loop = false
      pack.volume = muted ? 0 : Math.min(volume * 1.2, 1)
      pack.currentTime = 0
      pack.play().catch(() => {})
      setPackPlaying(true)
      setCurrentTrackName(packTrack.name)
    }
  }, [packTrack, hasInteracted, musicEnabled, muted, volume])

  const stopPackOpening = useCallback(() => {
    const pack = packRef.current
    if (pack) { pack.pause(); pack.currentTime = 0 }
    setPackPlaying(false)
    if (hasInteracted && musicEnabled) startAmbiance()
  }, [hasInteracted, musicEnabled, startAmbiance])

  return (
    <MusicContext.Provider value={{
      musicEnabled, setMusicEnabled,
      muted, setMuted,
      volume, setVolume,
      playPackOpening, stopPackOpening,
      isPlaying, currentTrackName,
    }}>
      {children}

      <audio ref={ambianceRef} loop preload="none" style={{ display: 'none' }} />
      <audio ref={packRef} preload="none" style={{ display: 'none' }} />

      {/* Bouton flottant mute/unmute — visible uniquement si pistes configurées et musique activée */}
      {hasTracks && musicEnabled && (
        <button
          onClick={() => setMuted(!muted)}
          title={muted ? 'Activer le son' : 'Couper le son'}
          className={`fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all ${
            isPlaying && !muted
              ? 'bg-[#F5C518]/20 border-[#F5C518]/40 text-[#F5C518]'
              : 'bg-[#12121f]/80 border-white/10 text-white/30 hover:text-white/60'
          }`}
        >
          {isPlaying && !muted && (
            <span className="absolute w-10 h-10 rounded-full border border-[#F5C518]/20 animate-ping pointer-events-none" />
          )}
          {muted ? <VolumeX size={14} /> : <Music size={14} />}
        </button>
      )}
    </MusicContext.Provider>
  )
}
