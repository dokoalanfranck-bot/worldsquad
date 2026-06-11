'use client'

import { useState } from 'react'
import { Users, Loader2, CheckCircle2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

async function runSeed(skipPhotos: boolean, setLoading: (v: boolean) => void, setDone: (v: boolean) => void) {
  setLoading(true)
  const toastId = toast.loading(skipPhotos ? 'Seed rapide en cours…' : 'Import avec photos… (~2 min)')
  try {
    const res = await fetch('/api/admin/seed-players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skipPhotos }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    toast.success(
      `✅ ${data.inserted} cartes · ${data.teamsProcessed} équipes${data.withPhotos ? ` · ${data.withPhotos} photos` : ''}`,
      { id: toastId, duration: 6000 }
    )
    if (data.errors?.length) console.warn('Seed warnings:', data.errors)
    setDone(true)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Erreur import joueurs', { id: toastId })
  } finally {
    setLoading(false)
  }
}

export function SeedPlayersButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function handleQuick() {
    if (!confirm('Seed rapide : importer les 48 nations sans photos (quelques secondes) ?')) return
    runSeed(true, setLoading, setDone)
  }

  function handleFull() {
    if (!confirm('Seed complet avec photos via TheSportsDB (~2-3 min) ?\n\nAttention : peut timeout sur Vercel.')) return
    runSeed(false, setLoading, setDone)
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 text-green-400 font-bold text-sm border border-green-500/20">
        <CheckCircle2 className="w-4 h-4" /> Joueurs importés !
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleQuick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 text-blue-400 font-bold text-sm border border-blue-500/20 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        {loading ? 'En cours…' : 'Seed rapide (48 nations)'}
      </button>
      <button
        onClick={handleFull}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-400 font-bold text-sm border border-white/10 transition-colors"
        title="Avec photos TheSportsDB — peut timeout"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
        + Photos
      </button>
    </div>
  )
}
