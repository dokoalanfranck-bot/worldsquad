'use client'

import { useState } from 'react'
import { Download, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function SeedWorldCupButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSeed() {
    if (!confirm('Importer toutes les équipes et les 104 matchs du Mondial 2026 ? Les matchs existants seront remplacés.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/seed-worldcup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`✅ ${data.teamsInserted} équipes · ${data.total} matchs importés`)
      setDone(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur import')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSeed}
      disabled={loading || done}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#ffd700] disabled:opacity-50 text-black font-bold text-sm transition-colors"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {done ? 'Importé !' : 'Importer Mondial 2026'}
    </button>
  )
}
