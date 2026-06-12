'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Music, Volume2, VolumeX, ChevronDown } from 'lucide-react'

interface Track { id: string; name: string; url: string }

interface MusicContextValue {
  playPackOpening: () => void
  stopPackOpening: () => void
}

const MusicContext = createContext<MusicContextValue>({
  playPackOpening: () => {},
  stopPackOpening: () => {},
})

export function useMusicContext() {
  return useContext(MusicContext)
}

const LS_MUTED = 'ws_music_muted'
const LS_VOLUME = 'ws_music_volume'

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [ambiance, setAmbiance] = useState<Track | null>(null)
  const [packTrack, setPackTrack] = useState<Track | null>(null)

  const [started, setStarted] = useState(false)       // user clicked play at least once
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [expanded, setExpanded] = useState(false)
  const [packPlaying, setPackPlaying] = useState(false)
  const [currentTrackName, setCurrentTrackName] = useState('')

  const ambianceRef = useRef<HTMLAudioElement | null>(null)
  const packRef = useRef<HTMLAudioElement | null>(null)

  // Charger les pistes actives
  useEffect(() => {
    fetch('/api/music/active')
      .then((r) => r.json())
      .then((d) => {
        setAmbiance(d.ambiance ?? null)
        setPackTrack(d.pack_opening ?? null)
        if (d.ambiance) setCurrentTrackName(d.ambiance.name)
      })
      .catch(() => {})
  }, [])

  // Charger les préférences utilisateur
  useEffect(() => {
    const savedMuted = localStorage.getItem(LS_MUTED)
    const savedVolume = localStorage.getItem(LS_VOLUME)
    if (savedMuted !== null) setMuted(savedMuted === 'true')
    if (savedVolume !== null) setVolume(parseFloat(savedVolume) || 0.5)
  }, [])

  // Synchroniser le volume sur l'élément audio ambiance
  useEffect(() => {
    const audio = ambianceRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  function applyVolume(audio: HTMLAudioElement, isMuted: boolean, vol: number) {
    audio.volume = isMuted ? 0 : vol
  }

  // Démarrer / arrêter l'ambiance
  const startAmbiance = useCallback(() => {
    if (!ambiance) return
    const audio = ambianceRef.current
    if (!audio) return
    if (audio.src !== ambiance.url) {
      audio.src = ambiance.url
      audio.loop = true
    }
    applyVolume(audio, muted, volume)
    audio.play().catch(() => {})
    setCurrentTrackName(ambiance.name)
  }, [ambiance, muted, volume])

  // Jouer la musique pack_opening
  const playPackOpening = useCallback(() => {
    if (!packTrack || !started) return
    const pack = packRef.current
    const amb = ambianceRef.current

    if (amb) { amb.pause() }

    if (pack) {
      if (pack.src !== packTrack.url) {
        pack.src = packTrack.url
        pack.loop = false
      }
      applyVolume(pack, muted, Math.min(volume * 1.2, 1))
      pack.currentTime = 0
      pack.play().catch(() => {})
      setPackPlaying(true)
      setCurrentTrackName(packTrack.name)
    } else if (amb) {
      // Pas de pack track, reprendre ambiance
      startAmbiance()
    }
  }, [packTrack, started, muted, volume, startAmbiance])

  const stopPackOpening = useCallback(() => {
    const pack = packRef.current
    if (pack) {
      pack.pause()
      pack.currentTime = 0
    }
    setPackPlaying(false)
    if (ambiance) {
      startAmbiance()
    } else {
      setCurrentTrackName(ambiance ? (ambiance as Track).name : '')
    }
  }, [ambiance, startAmbiance])

  // Quand la musique pack se termine → reprendre l'ambiance
  useEffect(() => {
    const pack = packRef.current
    if (!pack) return
    const onEnded = () => {
      setPackPlaying(false)
      startAmbiance()
    }
    pack.addEventListener('ended', onEnded)
    return () => pack.removeEventListener('ended', onEnded)
  }, [startAmbiance])

  function handleTogglePlay() {
    if (!started) {
      setStarted(true)
      startAmbiance()
      return
    }
    const amb = ambianceRef.current
    if (!amb) return
    if (amb.paused && !packPlaying) {
      startAmbiance()
    } else if (!packPlaying) {
      amb.pause()
    }
  }

  function handleToggleMute() {
    const next = !muted
    setMuted(next)
    localStorage.setItem(LS_MUTED, String(next))
    const amb = ambianceRef.current
    const pack = packRef.current
    if (amb) amb.volume = next ? 0 : volume
    if (pack) pack.volume = next ? 0 : Math.min(volume * 1.2, 1)
  }

  function handleVolumeChange(v: number) {
    setVolume(v)
    localStorage.setItem(LS_VOLUME, String(v))
    const amb = ambianceRef.current
    const pack = packRef.current
    if (amb) amb.volume = muted ? 0 : v
    if (pack && packPlaying) pack.volume = muted ? 0 : Math.min(v * 1.2, 1)
  }

  // Ne rien afficher si aucune piste configurée
  const hasAny = !!(ambiance || packTrack)

  return (
    <MusicContext.Provider value={{ playPackOpening, stopPackOpening }}>
      {children}

      {/* Éléments audio cachés */}
      <audio ref={ambianceRef} loop preload="none" className="hidden" />
      <audio ref={packRef} preload="none" className="hidden" />

      {/* Lecteur flottant (seulement si des pistes existent) */}
      {hasAny && (
        <div
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40"
          style={{ touchAction: 'none' }}
        >
          {/* Panel étendu */}
          {expanded && (
            <div className="mb-2 glass rounded-2xl border border-white/10 p-4 w-56 shadow-2xl shadow-black/50">
              {/* Track name */}
              <div className="flex items-center gap-2 mb-3">
                <Music size={12} className={`${started && !muted ? 'text-[#F5C518]' : 'text-white/30'}`} />
                <p className="text-white/70 text-xs truncate flex-1">{currentTrackName || 'Aucune piste'}</p>
                {packPlaying && (
                  <span className="text-[10px] text-[#F5C518] font-bold px-1.5 py-0.5 rounded bg-[#F5C518]/10">PACK</span>
                )}
              </div>

              {/* Volume slider */}
              <div className="flex items-center gap-2 mb-3">
                <button onClick={handleToggleMute} className="text-white/50 hover:text-white transition-colors flex-shrink-0">
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="flex-1 accent-[#F5C518] h-1"
                />
              </div>

              {/* Play/Stop button */}
              <button
                onClick={handleTogglePlay}
                className="w-full py-2 rounded-xl bg-[#F5C518]/15 hover:bg-[#F5C518]/25 border border-[#F5C518]/30 text-[#F5C518] text-xs font-bold transition-colors"
              >
                {!started ? '▶ LANCER LA MUSIQUE' : ambianceRef.current?.paused && !packPlaying ? '▶ REPRENDRE' : '⏸ PAUSE'}
              </button>
            </div>
          )}

          {/* Bouton principal */}
          <div className="flex items-center justify-end gap-2">
            {expanded && (
              <button
                onClick={() => setExpanded(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <ChevronDown size={14} />
              </button>
            )}
            <button
              onClick={() => {
                if (!expanded) setExpanded(true)
                else if (!started) {
                  setStarted(true)
                  startAmbiance()
                }
              }}
              title="Musique"
              className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all border ${
                started && !muted && (!ambianceRef.current?.paused || packPlaying)
                  ? 'bg-[#F5C518]/20 border-[#F5C518]/40 text-[#F5C518]'
                  : 'bg-[#12121f] border-white/10 text-white/40 hover:text-white hover:border-white/25'
              }`}
            >
              {/* Pulsing ring when playing */}
              {started && !muted && (!ambianceRef.current?.paused || packPlaying) && (
                <span className="absolute w-11 h-11 rounded-full border border-[#F5C518]/30 animate-ping" />
              )}
              <Music size={16} />
            </button>
          </div>
        </div>
      )}
    </MusicContext.Provider>
  )
}
