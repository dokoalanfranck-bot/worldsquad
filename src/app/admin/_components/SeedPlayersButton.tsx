'use client'

import { useState } from 'react'
import { Users, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function SeedPlayersButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSeed() {
    if (
      !confirm(
        'Importer les cartes joueurs pour les 48 nations du Mondial 2026 via TheSportsDB ?\n\nCela peut prendre 2-3 minutes (fetch pour chaque équipe). Les cartes joueurs existantes seront supprimées.'
      )
    )
      return

    setLoading(true)
    const toastId = toast.loading('Import en cours… (~2 min)')
    try {
      const res = await fetch('/api/admin/seed-players', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(
        `✅ ${data.totalCards} cartes joueurs · ${data.teamsProcessed} équipes`,
        { id: toastId, duration: 6000 }
      )
      if (data.errors?.length) {
        console.warn('Seed warnings:', data.errors)
      }
      setDone(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur import joueurs', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSeed}
      disabled={loading || done}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 text-blue-400 font-bold text-sm border border-blue-500/20 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <Users className="w-4 h-4" />
      )}
      {done ? 'Joueurs importés !' : loading ? 'Import en cours…' : 'Importer joueurs'}
    </button>
  )
}
