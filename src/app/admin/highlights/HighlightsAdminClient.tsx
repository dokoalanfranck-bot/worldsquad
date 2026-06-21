'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Youtube, Film, Upload, Video, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Highlight {
  id: string
  title: string
  youtube_id: string | null
  video_url: string | null
  match_id: string | null
  created_at: string
}

interface Match {
  id: string
  team_a: string
  team_b: string
  match_date: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function HighlightsAdminClient({ highlights, matches }: { highlights: Highlight[]; matches: Match[] }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Onglet actif
  const [tab, setTab] = useState<'youtube' | 'upload'>('youtube')

  // Formulaire YouTube
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [matchId, setMatchId] = useState('')
  const [loading, setLoading] = useState(false)

  // Formulaire upload vidéo
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadMatchId, setUploadMatchId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [deleting, setDeleting] = useState<string | null>(null)

  async function addYoutube() {
    if (!title.trim() || !url.trim()) { toast.error('Titre et URL requis'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, youtube_url: url, match_id: matchId || undefined }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Résumé ajouté !')
      setTitle(''); setUrl(''); setMatchId('')
      router.refresh()
    } finally { setLoading(false) }
  }

  async function uploadVideo() {
    if (!uploadTitle.trim()) { toast.error('Titre requis'); return }
    if (!uploadFile) { toast.error('Sélectionne une vidéo'); return }
    if (uploadFile.size > 500 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 500 Mo)'); return }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Étape 1 : obtenir l'URL signée pour l'upload direct dans Supabase Storage
      const signRes = await fetch('/api/admin/highlights/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: uploadFile.name, contentType: uploadFile.type || 'video/mp4' }),
      })
      if (!signRes.ok) {
        const { error } = await signRes.json() as { error?: string }
        toast.error(error ?? 'Erreur initialisation upload')
        return
      }
      const { signedUrl, publicUrl } = await signRes.json() as { signedUrl: string; path: string; publicUrl: string }

      // Étape 2 : upload direct navigateur → Supabase Storage (avec progression)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 90))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload échoué : ${xhr.status} ${xhr.responseText}`))
        }
        xhr.onerror = () => reject(new Error('Erreur réseau'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', uploadFile.type || 'video/mp4')
        xhr.send(uploadFile)
      })

      setUploadProgress(95)

      // Étape 3 : sauvegarder les métadonnées en base
      const saveRes = await fetch('/api/admin/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: uploadTitle, video_url: publicUrl, match_id: uploadMatchId || undefined }),
      })
      if (!saveRes.ok) {
        const { error } = await saveRes.json() as { error?: string }
        toast.error(error ?? 'Erreur sauvegarde')
        return
      }

      setUploadProgress(100)
      toast.success('Vidéo uploadée !')
      setUploadTitle(''); setUploadFile(null); setUploadMatchId('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur upload')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  async function remove(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/admin/highlights/${id}`, { method: 'DELETE' })
      toast.success('Supprimé')
      router.refresh()
    } finally { setDeleting(null) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Film size={24} className="text-[#F5C518]" />
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          RÉSUMÉS VIDÉO
        </h1>
      </div>

      {/* Formulaire */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        {/* Onglets */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setTab('youtube')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
              tab === 'youtube'
                ? 'bg-red-600/15 text-red-400 border-b-2 border-red-500'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <Youtube size={15} /> Lien YouTube
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
              tab === 'upload'
                ? 'bg-blue-600/15 text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <Upload size={15} /> Upload vidéo
          </button>
        </div>

        <div className="p-5 space-y-4">
          {tab === 'youtube' ? (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre (ex: France vs Maroc — Résumé)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/50"
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Lien YouTube (ex: https://youtu.be/xxxxx)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/50"
              />
              <select
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                className="w-full bg-[#091524] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#F5C518]/50"
              >
                <option value="">— Lier à un match (optionnel) —</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.team_a} vs {m.team_b} — {new Date(m.match_date).toLocaleDateString('fr-FR')}
                  </option>
                ))}
              </select>
              <button
                onClick={addYoutube}
                disabled={loading}
                className="flex items-center gap-2 bg-[#F5C518] disabled:opacity-50 text-black font-black px-6 py-2.5 rounded-xl"
              >
                <Plus size={16} /> {loading ? 'Ajout…' : 'Ajouter'}
              </button>
            </>
          ) : (
            <>
              <input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Titre du résumé"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
              />

              {/* Zone de sélection de fichier */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 ${
                  uploadFile ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-white/30'
                }`}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <Video size={20} className="text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-white text-sm font-bold truncate max-w-xs">{uploadFile.name}</p>
                        <p className="text-gray-500 text-xs">{formatBytes(uploadFile.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-gray-500" />
                    <p className="text-gray-400 text-sm text-center">
                      Clique pour sélectionner une vidéo
                      <span className="block text-gray-600 text-xs mt-1">MP4, MOV, WebM — max 500 Mo</span>
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    if (f && f.size > 500 * 1024 * 1024) {
                      toast.error('Fichier trop volumineux (max 500 Mo)')
                      return
                    }
                    setUploadFile(f)
                  }}
                />
              </div>

              {/* Barre de progression */}
              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{uploadProgress < 95 ? 'Upload en cours…' : uploadProgress < 100 ? 'Finalisation…' : 'Terminé !'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <select
                value={uploadMatchId}
                onChange={(e) => setUploadMatchId(e.target.value)}
                className="w-full bg-[#091524] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="">— Lier à un match (optionnel) —</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.team_a} vs {m.team_b} — {new Date(m.match_date).toLocaleDateString('fr-FR')}
                  </option>
                ))}
              </select>

              <button
                onClick={uploadVideo}
                disabled={uploading || !uploadFile}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-xl transition-colors"
              >
                <Upload size={16} /> {uploading ? `${uploadProgress}%…` : 'Uploader'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {highlights.length === 0 && (
          <p className="text-gray-500 text-center py-8">Aucun résumé pour l&apos;instant</p>
        )}
        {highlights.map((h) => (
          <div key={h.id} className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
            {h.youtube_id ? (
              <img
                src={`https://img.youtube.com/vi/${h.youtube_id}/mqdefault.jpg`}
                alt={h.title}
                className="w-24 h-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-14 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Video size={20} className="text-blue-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{h.title}</p>
              {h.youtube_id ? (
                <a
                  href={`https://youtu.be/${h.youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F5C518] text-xs flex items-center gap-1 mt-0.5 hover:underline"
                >
                  <Youtube size={12} /> youtu.be/{h.youtube_id}
                </a>
              ) : (
                <p className="text-blue-400 text-xs mt-0.5 flex items-center gap-1">
                  <Upload size={12} /> Vidéo uploadée
                </p>
              )}
            </div>
            <button
              onClick={() => remove(h.id)}
              disabled={deleting === h.id}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
