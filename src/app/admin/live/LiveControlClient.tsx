'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Play, Square, Plus, Minus, RefreshCw, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

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
}

interface Props {
  initialLive: Match[]
  initialUpcoming: Match[]
  cronEnabled: boolean
}

export function LiveControlClient({ initialLive, initialUpcoming, cronEnabled }: Props) {
  const supabase = createClient()
  const [live, setLive] = useState<Match[]>(initialLive)
  const [upcoming, setUpcoming] = useState<Match[]>(initialUpcoming)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const channel = supabase
      .channel('admin-live-ctrl')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
        const m = payload.new as Match
        if (m.status === 'live') {
          setLive((prev) => {
            const exists = prev.find((x) => x.id === m.id)
            return exists ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev]
          })
          setUpcoming((prev) => prev.filter((x) => x.id !== m.id))
        } else {
          setLive((prev) => prev.filter((x) => x.id !== m.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  async function patch(matchId: string, fields: Record<string, unknown>) {
    setPending((p) => { const s = new Set(p); s.add(matchId); return s })
    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Erreur de mise à jour')
    } finally {
      setPending((p) => { const s = new Set(p); s.delete(matchId); return s })
    }
  }

  function optimisticScore(matchId: string, field: 'score_a' | 'score_b', val: number) {
    setLive((prev) => prev.map((m) => (m.id === matchId ? { ...m, [field]: val } : m)))
  }

  async function adjustScore(match: Match, team: 'a' | 'b', delta: number) {
    const field: 'score_a' | 'score_b' = team === 'a' ? 'score_a' : 'score_b'
    const current = (team === 'a' ? match.score_a : match.score_b) ?? 0
    const next = Math.max(0, current + delta)
    optimisticScore(match.id, field, next)
    await patch(match.id, { [field]: next })
  }

  async function startMatch(matchId: string) {
    await patch(matchId, { status: 'live', score_a: 0, score_b: 0 })
    toast.success('Match démarré !')
  }

  async function finishMatch(matchId: string) {
    await patch(matchId, { status: 'finished', _trigger_calculate: true })
    toast.success('Match terminé · Pronostics calculés')
  }

  async function triggerSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/cron/sync-scores', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}` },
      })
      const d = await res.json()
      if (d.updated > 0) toast.success(`${d.updated} match(s) mis à jour`)
      else toast.success('Scores déjà à jour')
    } catch {
      toast.error('Sync API échouée')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h1 className="font-bebas text-4xl text-white">LIVE CONTROL</h1>
        </div>
        {cronEnabled && (
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync API maintenant
          </button>
        )}
      </div>

      {/* Cron status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
        cronEnabled
          ? 'bg-green-500/5 border-green-500/20 text-green-400'
          : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400'
      }`}>
        <Zap size={14} />
        {cronEnabled
          ? 'Sync automatique active · toutes les minutes · via API-Football'
          : 'Sync automatique désactivée — ajoute RAPIDAPI_KEY dans les variables Vercel pour l\'activer'}
      </div>

      {/* Live matches */}
      <div>
        <h2 className="font-bebas text-2xl text-red-400 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          EN DIRECT ({live.length})
        </h2>

        {live.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center border border-white/5">
            <p className="text-white/30 text-sm">Aucun match en direct pour l&apos;instant</p>
            <p className="text-white/20 text-xs mt-1">Lance un match depuis la section ci-dessous</p>
          </div>
        ) : (
          <div className="space-y-4">
            {live.map((match) => (
              <div key={match.id} className="glass rounded-2xl p-5 border border-red-500/20 bg-red-500/3">
                {/* Teams & score */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-3xl">{match.flag_a ?? '🏳'}</span>
                    <span className="text-white font-bold text-sm leading-tight">{match.team_a}</span>
                  </div>
                  <div className="font-bebas text-4xl text-white tabular-nums text-center min-w-[80px]">
                    {match.score_a ?? 0} – {match.score_b ?? 0}
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="text-white font-bold text-sm leading-tight text-right">{match.team_b}</span>
                    <span className="text-3xl">{match.flag_b ?? '🏳'}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-3 gap-3 items-center">
                  {/* Team A controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => adjustScore(match, 'a', -1)}
                      disabled={pending.has(match.id) || (match.score_a ?? 0) <= 0}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white font-bold text-lg flex items-center justify-center transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      onClick={() => adjustScore(match, 'a', 1)}
                      disabled={pending.has(match.id)}
                      className="flex-1 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 text-blue-400 font-black text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus size={14} /> BUT
                    </button>
                  </div>

                  {/* Finish button */}
                  <button
                    onClick={() => finishMatch(match.id)}
                    disabled={pending.has(match.id)}
                    className="py-2.5 rounded-xl bg-green-500/15 border border-green-500/25 hover:bg-green-500/25 disabled:opacity-40 text-green-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Square size={12} /> TERMINER
                  </button>

                  {/* Team B controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => adjustScore(match, 'b', 1)}
                      disabled={pending.has(match.id)}
                      className="flex-1 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 text-blue-400 font-black text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus size={14} /> BUT
                    </button>
                    <button
                      onClick={() => adjustScore(match, 'b', -1)}
                      disabled={pending.has(match.id) || (match.score_b ?? 0) <= 0}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white font-bold text-lg flex items-center justify-center transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                </div>

                {pending.has(match.id) && (
                  <p className="text-center text-xs text-white/30 mt-2 animate-pulse">Sauvegarde…</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming matches */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-[#F5C518] mb-4">PROCHAINS MATCHS</h2>
          <div className="space-y-2">
            {upcoming.map((match) => (
              <div key={match.id} className="glass rounded-xl p-4 border border-white/5 flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xl flex-shrink-0">{match.flag_a ?? '🏳'}</span>
                  <span className="text-white font-semibold text-sm truncate">{match.team_a}</span>
                  <span className="text-white/30 text-xs font-bold">vs</span>
                  <span className="text-white font-semibold text-sm truncate">{match.team_b}</span>
                  <span className="text-xl flex-shrink-0">{match.flag_b ?? '🏳'}</span>
                </div>
                <span className="text-white/40 text-sm flex-shrink-0">
                  {new Date(match.match_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => startMatch(match.id)}
                  disabled={pending.has(match.id)}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-40 text-red-400 text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Play size={13} /> DÉMARRER
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {live.length === 0 && upcoming.length === 0 && (
        <div className="glass rounded-xl p-10 text-center border border-white/5">
          <p className="text-white/30 text-sm">Aucun match prévu prochainement</p>
          <a href="/admin/matches" className="text-[#F5C518] text-sm hover:underline mt-2 inline-block">
            Gérer les matchs →
          </a>
        </div>
      )}
    </div>
  )
}
