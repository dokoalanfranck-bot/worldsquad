'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Youtube, Film } from 'lucide-react'
import toast from 'react-hot-toast'

interface Highlight {
  id: string
  title: string
  youtube_id: string
  match_id: string | null
  created_at: string
}

interface Match {
  id: string
  team_a: string
  team_b: string
  match_date: string
}

export function HighlightsAdminClient({ highlights, matches }: { highlights: Highlight[]; matches: Match[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [matchId, setMatchId] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function add() {
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

      {/* Form */}
      <div className="bg-white/5 rounded-2xl p-5 space-y-4 border border-white/10">
        <p className="text-white font-bold">Ajouter un résumé</p>
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
          onClick={add}
          disabled={loading}
          className="flex items-center gap-2 bg-[#F5C518] disabled:opacity-50 text-black font-black px-6 py-2.5 rounded-xl"
        >
          <Plus size={16} /> {loading ? 'Ajout…' : 'Ajouter'}
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {highlights.length === 0 && (
          <p className="text-gray-500 text-center py-8">Aucun résumé pour l&apos;instant</p>
        )}
        {highlights.map((h) => (
          <div key={h.id} className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
            <img
              src={`https://img.youtube.com/vi/${h.youtube_id}/mqdefault.jpg`}
              alt={h.title}
              className="w-24 h-14 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{h.title}</p>
              <a
                href={`https://youtu.be/${h.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F5C518] text-xs flex items-center gap-1 mt-0.5 hover:underline"
              >
                <Youtube size={12} /> youtu.be/{h.youtube_id}
              </a>
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
