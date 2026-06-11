'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function ResetUsersButton() {
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    const first = confirm(
      '⚠️ RESET GLOBAL\n\nCette action va supprimer pour TOUS les utilisateurs :\n• Toutes les cartes obtenues\n• Remettre les coins à 500\n• Remettre les victoires et streaks à 0\n\nContinuer ?'
    )
    if (!first) return

    const second = confirm('Confirmation finale : cette action est irréversible. Voulez-vous vraiment continuer ?')
    if (!second) return

    setLoading(true)
    const toastId = toast.loading('Réinitialisation en cours…')
    try {
      const res = await fetch('/api/admin/reset-users', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Reset effectué : cartes, coins et victoires réinitialisés', { id: toastId, duration: 6000 })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors du reset', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-400 font-bold text-sm border border-red-500/20 transition-colors"
      title="Réinitialiser cartes, coins et victoires de tous les utilisateurs"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      {loading ? 'Reset…' : 'Reset utilisateurs'}
    </button>
  )
}
