'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Save, Calculator, ArrowLeft, Target, Loader2 } from 'lucide-react'

interface Match {
  id: string
  team_a: string
  team_b: string
  flag_a: string | null
  flag_b: string | null
  match_date: string
  score_a: number | null
  score_b: number | null
  status: string
  phase: string | null
  group_letter?: string | null
  stadium?: string | null
  city?: string | null
}

interface MatchEditClientProps {
  match: Match
  predictionsCount: number
}

const PHASES = [
  { value: 'group', label: 'Phase de groupes' },
  { value: 'round_of_32', label: 'Tour préliminaire (32)' },
  { value: 'round_of_16', label: '8ème de finale' },
  { value: 'quarter_final', label: 'Quart de finale' },
  { value: 'semi_final', label: 'Demi-finale' },
  { value: 'final', label: 'Finale' },
]

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export function MatchEditClient({ match, predictionsCount }: MatchEditClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)

  const [form, setForm] = useState({
    team_a: match.team_a,
    team_b: match.team_b,
    flag_a: match.flag_a ?? '',
    flag_b: match.flag_b ?? '',
    match_date: match.match_date ? match.match_date.slice(0, 16) : '',
    phase: match.phase ?? 'group',
    group_letter: match.group_letter ?? '',
    stadium: match.stadium ?? '',
    city: match.city ?? '',
    status: match.status,
    score_a: match.score_a?.toString() ?? '0',
    score_b: match.score_b?.toString() ?? '0',
  })

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        team_a: form.team_a,
        team_b: form.team_b,
        flag_a: form.flag_a || null,
        flag_b: form.flag_b || null,
        match_date: form.match_date,
        phase: form.phase || null,
        group_letter: form.group_letter || null,
        stadium: form.stadium || null,
        city: form.city || null,
        status: form.status,
      }
      if (form.status === 'finished') {
        body.score_a = parseInt(form.score_a)
        body.score_b = parseInt(form.score_b)
      }

      const res = await fetch(`/api/admin/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erreur sauvegarde')
      toast.success('Match mis à jour')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      // Use admin PATCH route with calculate=true flag which internally calls the calculate endpoint
      const res = await fetch(`/api/admin/matches/${match.id}?calculate=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _trigger_calculate: true }),
      })
      if (!res.ok) throw new Error('Erreur calcul')
      toast.success('Pronostics calculés et coins distribués')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/matches"
          className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bebas text-3xl text-white">
            {match.team_a} vs {match.team_b}
          </h1>
          <p className="text-white/50 text-sm">Modifier le match</p>
        </div>
      </div>

      {/* Predictions info */}
      <div className="flex items-center gap-3 p-4 glass rounded-xl">
        <Target className="w-5 h-5 text-blue-400" />
        <div>
          <p className="text-white text-sm font-medium">{predictionsCount} pronostic{predictionsCount !== 1 ? 's' : ''}</p>
          <p className="text-white/40 text-xs">Pour ce match</p>
        </div>
        {match.status === 'finished' && (
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calculer les pronostics
          </button>
        )}
      </div>

      {/* Form */}
      <div className="glass rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Équipe A</label>
            <input
              value={form.team_a}
              onChange={(e) => update('team_a', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Équipe B</label>
            <input
              value={form.team_b}
              onChange={(e) => update('team_b', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Drapeau A</label>
            <input
              value={form.flag_a}
              onChange={(e) => update('flag_a', e.target.value)}
              placeholder="🏳"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Drapeau B</label>
            <input
              value={form.flag_b}
              onChange={(e) => update('flag_b', e.target.value)}
              placeholder="🏳"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Date et heure</label>
          <input
            type="datetime-local"
            value={form.match_date}
            onChange={(e) => update('match_date', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Phase</label>
            <select
              value={form.phase}
              onChange={(e) => update('phase', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            >
              {PHASES.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#12121f]">{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Groupe</label>
            <select
              value={form.group_letter}
              onChange={(e) => update('group_letter', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            >
              <option value="" className="bg-[#12121f]">— Aucun —</option>
              {GROUP_LETTERS.map((g) => (
                <option key={g} value={g} className="bg-[#12121f]">Groupe {g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Stade</label>
            <input
              value={form.stadium}
              onChange={(e) => update('stadium', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Ville</label>
            <input
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Statut</label>
          <select
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
          >
            <option value="upcoming" className="bg-[#12121f]">À venir</option>
            <option value="live" className="bg-[#12121f]">Live</option>
            <option value="finished" className="bg-[#12121f]">Terminé</option>
          </select>
        </div>

        {form.status === 'finished' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Score {form.team_a}</label>
              <input
                type="number"
                min="0"
                value={form.score_a}
                onChange={(e) => update('score_a', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Score {form.team_b}</label>
              <input
                type="number"
                min="0"
                value={form.score_b}
                onChange={(e) => update('score_b', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </button>
      </div>
    </div>
  )
}
