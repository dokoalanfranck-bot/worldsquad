'use client'

import { useState, useRef } from 'react'
import { Upload, Trash2, Play, Pause, CheckCircle, Music, Package } from 'lucide-react'
import toast from 'react-hot-toast'

interface MusicTrack {
  id: string
  name: string
  file_name: string
  url: string
  type: 'ambiance' | 'pack_opening'
  active: boolean
  size_bytes: number | null
  created_at: string
}

interface Props {
  initialTracks: MusicTrack[]
}

const TYPE_LABELS = {
  ambiance: { label: 'Ambiance', icon: Music, desc: 'Musique de fond diffusée sur tout le site' },
  pack_opening: { label: 'Ouverture de pack', icon: Package, desc: 'Joue lors de l\'ouverture d\'un pack de cartes' },
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function TrackRow({
  track,
  onActivate,
  onDelete,
}: {
  track: MusicTrack
  onActivate: (id: string, active: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [playing, setPlaying] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => toast.error('Lecture impossible'))
    }
  }

  async function handleActivate() {
    setLoadingAction(true)
    await onActivate(track.id, !track.active)
    setLoadingAction(false)
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${track.name}" ?`)) return
    setLoadingAction(true)
    await onDelete(track.id)
    setLoadingAction(false)
  }

  return (
    <div className={`glass rounded-xl p-4 border flex items-center gap-4 transition-all ${
      track.active ? 'border-[#F5C518]/30 bg-[#F5C518]/3' : 'border-white/5'
    }`}>
      {/* Play preview */}
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <audio
        ref={audioRef}
        src={`/api/music/stream/${track.id}`}
        onEnded={() => setPlaying(false)}
        preload="none"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{track.name}</p>
        <p className="text-white/30 text-xs truncate">{track.file_name} {track.size_bytes ? `· ${formatSize(track.size_bytes)}` : ''}</p>
      </div>

      {/* Active badge */}
      {track.active && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/30 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518] animate-pulse" />
          <span className="text-[#F5C518] text-xs font-bold">ACTIF</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleActivate}
          disabled={loadingAction}
          title={track.active ? 'Désactiver' : 'Activer'}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 ${
            track.active
              ? 'bg-[#F5C518]/15 border border-[#F5C518]/30 text-[#F5C518] hover:bg-[#F5C518]/25'
              : 'bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10'
          }`}
        >
          <CheckCircle size={15} />
        </button>
        <button
          onClick={handleDelete}
          disabled={loadingAction}
          className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function UploadZone({
  type,
  onUploaded,
}: {
  type: 'ambiance' | 'pack_opening'
  onUploaded: (track: MusicTrack) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [name, setName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file) return
    setUploading(true)
    setProgress('Envoi en cours…')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    formData.append('name', name.trim() || file.name.replace(/\.[^.]+$/, ''))

    try {
      const res = await fetch('/api/admin/music/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur upload')
      onUploaded(data.track)
      setName('')
      toast.success(`"${data.track.name}" uploadé avec succès !`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur upload')
    } finally {
      setUploading(false)
      setProgress('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de la piste (optionnel)"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#F5C518]/40"
      />
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          uploading
            ? 'border-[#F5C518]/40 bg-[#F5C518]/5'
            : 'border-white/10 hover:border-white/25 hover:bg-white/3'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/ogg,audio/wav,audio/aac,audio/mp4,audio/x-m4a,.mp3,.ogg,.wav,.aac,.m4a"
          onChange={onInputChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#F5C518] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#F5C518] text-sm">{progress}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/40">
            <Upload size={24} />
            <p className="text-sm">Glisser un fichier ou cliquer pour parcourir</p>
            <p className="text-xs">MP3, OGG, WAV, AAC, M4A · Max 30 MB</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function MusicAdminClient({ initialTracks }: Props) {
  const [tracks, setTracks] = useState<MusicTrack[]>(initialTracks)
  const [activeTab, setActiveTab] = useState<'ambiance' | 'pack_opening'>('ambiance')

  const filtered = tracks.filter((t) => t.type === activeTab)

  function handleUploaded(track: MusicTrack) {
    setTracks((prev) => [track, ...prev])
  }

  async function handleActivate(id: string, active: boolean) {
    const res = await fetch(`/api/admin/music/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    if (!res.ok) { toast.error('Erreur'); return }

    const data = await res.json()
    setTracks((prev) =>
      prev.map((t) => {
        if (t.type !== data.track.type) return t
        return t.id === id ? data.track : { ...t, active: false }
      })
    )
    toast.success(active ? 'Piste activée ✓' : 'Piste désactivée')
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/music/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erreur suppression'); return }
    setTracks((prev) => prev.filter((t) => t.id !== id))
    toast.success('Piste supprimée')
  }

  const tabs: { key: 'ambiance' | 'pack_opening' }[] = [{ key: 'ambiance' }, { key: 'pack_opening' }]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Music size={24} className="text-[#F5C518]" />
        <h1 className="font-bebas text-4xl text-white">GESTION MUSIQUE</h1>
      </div>

      {/* Info banner */}
      <div className="glass rounded-xl p-4 border border-white/5 text-sm text-white/50 flex items-start gap-3">
        <Music size={16} className="text-white/30 mt-0.5 flex-shrink-0" />
        <div>
          <p>La musique <strong className="text-white/70">Ambiance</strong> joue en fond sur toute l&apos;application (lecture automatique après interaction utilisateur).</p>
          <p className="mt-1">La musique <strong className="text-white/70">Ouverture de pack</strong> remplace l&apos;ambiance pendant l&apos;animation d&apos;ouverture.</p>
          <p className="mt-1 text-white/30">Une seule piste peut être active par catégorie. Les utilisateurs peuvent couper la musique depuis le bouton flottant.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ key }) => {
          const cfg = TYPE_LABELS[key]
          const Icon = cfg.icon
          const isActive = activeTab === key
          const hasActive = tracks.some((t) => t.type === key && t.active)
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#F5C518]/15 border border-[#F5C518]/30 text-[#F5C518]'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={14} />
              {cfg.label}
              {hasActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518] animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div>
          <p className="text-white/40 text-xs mb-3">{TYPE_LABELS[activeTab].desc}</p>

          {/* Upload zone */}
          <div className="glass rounded-2xl p-5 border border-white/5 mb-4">
            <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Upload size={14} />
              Ajouter une piste
            </p>
            <UploadZone type={activeTab} onUploaded={handleUploaded} />
          </div>

          {/* Track list */}
          {filtered.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center border border-white/5">
              <Music size={28} className="text-white/20 mx-auto mb-2" />
              <p className="text-white/30 text-sm">Aucune piste uploadée pour cette catégorie</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  onActivate={handleActivate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
