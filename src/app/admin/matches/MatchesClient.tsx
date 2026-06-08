'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Search, Edit, CheckCircle2, Loader2, Save } from 'lucide-react'

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
}

interface MatchesClientProps {
  matches: Match[]
  currentPhase: string
  currentStatus: string
  currentSearch: string
}

const PHASES = [
  { value: 'all', label: 'Tous' },
  { value: 'group', label: 'Groupes' },
  { value: 'round_of_32', label: 'Tour 32' },
  { value: 'round_of_16', label: '8ème' },
  { value: 'quarter_final', label: 'Quart' },
  { value: 'semi_final', label: 'Demi' },
  { value: 'final', label: 'Finale' },
]

const STATUSES = [
  { value: 'all', label: 'Tous' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'live', label: 'Live' },
  { value: 'finished', label: 'Terminé' },
]

function ScoreForm({ match }: { match: Match }) {
  const router = useRouter()
  const [scoreA, setScoreA] = useState(match.score_a?.toString() ?? '0')
  const [scoreB, setScoreB] = useState(match.score_b?.toString() ?? '0')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score_a: parseInt(scoreA),
          score_b: parseInt(scoreB),
          status: 'finished',
        }),
      })
      if (!res.ok) throw new Error('Erreur sauvegarde')

      // Trigger prediction calculation
      await fetch(`/api/admin/matches/${match.id}?calculate=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _trigger_calculate: true }),
      }).catch(() => {})

      toast.success('Score enregistré · pronostics calculés')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        value={scoreA}
        onChange={(e) => setScoreA(e.target.value)}
        className="w-12 bg-white/10 border border-white/10 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-blue-500/50"
      />
      <span className="text-white/40">-</span>
      <input
        type="number"
        min="0"
        value={scoreB}
        onChange={(e) => setScoreB(e.target.value)}
        className="w-12 bg-white/10 border border-white/10 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-blue-500/50"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        Enregistrer
      </button>
    </div>
  )
}

export function MatchesClient({ matches, currentPhase, currentStatus, currentSearch }: MatchesClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch)
  const [, startTransition] = useTransition()

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams()
    const phase = updates.phase ?? currentPhase
    const status = updates.status ?? currentStatus
    const q = updates.search ?? search

    if (phase !== 'all') params.set('phase', phase)
    if (status !== 'all') params.set('status', status)
    if (q) params.set('search', q)

    startTransition(() => {
      router.push(`/admin/matches?${params.toString()}`)
    })
  }

  const handleSearch = (val: string) => {
    setSearch(val)
    const params = new URLSearchParams()
    if (currentPhase !== 'all') params.set('phase', currentPhase)
    if (currentStatus !== 'all') params.set('status', currentStatus)
    if (val) params.set('search', val)
    router.push(`/admin/matches?${params.toString()}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finished':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/20">Terminé</span>
      case 'live':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/20 animate-pulse">Live</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/60">À venir</span>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bebas text-4xl text-white">MATCHS</h1>
        <p className="text-white/50 text-sm mt-1">{matches.length} matchs · Gestion des scores et pronostics</p>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        {/* Phase tabs */}
        <div className="flex flex-wrap gap-2">
          {PHASES.map((p) => (
            <button
              key={p.value}
              onClick={() => updateFilters({ phase: p.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentPhase === p.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => updateFilters({ status: s.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentStatus === s.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher équipe…"
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Match</th>
                <th className="px-4 py-3 text-left">Phase</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Score</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {matches.map((match) => (
                <tr key={match.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white/50 whitespace-nowrap">
                    {new Date(match.match_date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-base">{match.flag_a ?? '🏳'}</span>
                      <span className="text-white">{match.team_a}</span>
                      <span className="text-white/30 text-xs">vs</span>
                      <span className="text-white">{match.team_b}</span>
                      <span className="text-base">{match.flag_b ?? '🏳'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50 capitalize text-xs">
                    {match.phase ?? '—'}
                    {match.group_letter && <span className="ml-1 text-blue-400/70">({match.group_letter})</span>}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(match.status)}</td>
                  <td className="px-4 py-3">
                    {match.status === 'finished' ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{match.score_a} - {match.score_b}</span>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                    ) : (
                      <ScoreForm match={match} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/matches/${match.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs"
                    >
                      <Edit className="w-3 h-3" />
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/30 text-sm">
                    Aucun match trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
