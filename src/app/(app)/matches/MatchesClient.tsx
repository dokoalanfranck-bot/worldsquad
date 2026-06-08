'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Match, Prediction } from '@/types'

type Filter = 'all' | 'mine' | 'today' | 'group' | 'knockout'

interface Props {
  matches: Match[]
  predictionsByMatch: Record<string, Prediction>
  userNation: string
}

function MatchCard({
  match,
  prediction,
  userNation,
}: {
  match: Match
  prediction?: Prediction
  userNation: string
}) {
  const isMyNation = match.team_a === userNation || match.team_b === userNation
  const statusColors = {
    upcoming: 'text-gray-500 bg-white/5',
    live: 'text-green-400 bg-green-400/10 animate-pulse',
    finished: 'text-gray-500 bg-white/5',
  }

  return (
    <Link href={`/matches/${match.id}`}>
      <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        className={`glass rounded-2xl p-4 border transition-all cursor-pointer ${
          isMyNation
            ? 'border-[#F5C518]/20 hover:border-[#F5C518]/40'
            : 'border-white/5 hover:border-white/15'
        }`}
      >
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {match.group_name && (
              <span className="text-xs font-bold text-gray-500 uppercase">
                Groupe {match.group_name}
              </span>
            )}
            {isMyNation && (
              <span className="text-xs font-bold text-[#F5C518] bg-[#F5C518]/10 px-2 py-0.5 rounded">
                ⭐ Ta nation
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${statusColors[match.status]}`}
            >
              {match.status === 'live' ? '🔴 LIVE' : match.status === 'finished' ? 'Terminé' : 'À venir'}
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <div className="text-3xl mb-1">{match.flag_a ?? '🏳'}</div>
            <div
              className="text-white font-black text-sm"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {match.team_a}
            </div>
          </div>

          <div className="px-4 text-center min-w-[80px]">
            {match.status === 'finished' && match.score_a !== null ? (
              <div
                className="text-2xl font-black text-white"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {match.score_a} — {match.score_b}
              </div>
            ) : match.status === 'live' ? (
              <div
                className="text-2xl font-black text-green-400"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {match.score_a ?? 0} — {match.score_b ?? 0}
              </div>
            ) : (
              <div className="text-xs text-gray-500 font-semibold">
                {new Date(match.match_date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
                <br />
                {new Date(match.match_date).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>

          <div className="flex-1 text-center">
            <div className="text-3xl mb-1">{match.flag_b ?? '🏳'}</div>
            <div
              className="text-white font-black text-sm"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {match.team_b}
            </div>
          </div>
        </div>

        {/* Prediction preview */}
        {prediction && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <span className="text-gray-500">Mon prono :</span>
            <span className="text-[#F5C518] font-bold">
              {prediction.pred_score_a} — {prediction.pred_score_b}
            </span>
            {prediction.status !== 'pending' && (
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  prediction.status === 'correct_score'
                    ? 'text-green-400 bg-green-400/10'
                    : prediction.status === 'correct_winner'
                    ? 'text-blue-400 bg-blue-400/10'
                    : 'text-red-400 bg-red-400/10'
                }`}
              >
                {prediction.status === 'correct_score'
                  ? '+300 🪙'
                  : prediction.status === 'correct_winner'
                  ? '+100 🪙'
                  : 'Raté'}
              </span>
            )}
          </div>
        )}

        {/* CTA for upcoming without prediction */}
        {match.status === 'upcoming' && !prediction && (
          <div className="mt-3 text-center">
            <span className="text-xs text-[#F5C518] font-bold">+ Faire mon pronostic →</span>
          </div>
        )}
      </motion.div>
    </Link>
  )
}

export function MatchesClient({ matches, predictionsByMatch, userNation }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const todayStr = new Date().toDateString()

  const filtered = matches.filter((m) => {
    if (filter === 'mine') return m.team_a === userNation || m.team_b === userNation
    if (filter === 'today') return new Date(m.match_date).toDateString() === todayStr
    if (filter === 'group') return m.phase === 'group'
    if (filter === 'knockout') return m.phase !== 'group'
    return true
  })

  const grouped = filtered.reduce((acc, m) => {
    const key = new Date(m.match_date).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
    return { ...acc, [key]: [...(acc[key] ?? []), m] }
  }, {} as Record<string, Match[]>)

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-4xl font-black text-white mb-1"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          MATCHS & PRONOSTICS
        </h1>
        <p className="text-gray-500 text-sm">104 matchs · FIFA World Cup 2026</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as Filter)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === f.key
                ? 'bg-[#F5C518] text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Match list by day */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, dayMatches]) => (
          <div key={date}>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="capitalize">{date}</span>
              <span className="text-gray-700">({dayMatches.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {dayMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predictionsByMatch[match.id]}
                  userNation={userNation}
                />
              ))}
            </div>
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <div className="text-4xl mb-3">⚽</div>
            <p>Aucun match pour ce filtre</p>
          </div>
        )}
      </div>
    </div>
  )
}

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'mine', label: '⭐ Mes matchs' },
  { key: 'today', label: 'Aujourd\'hui' },
  { key: 'group', label: 'Phase de groupes' },
  { key: 'knockout', label: 'Knockout' },
]
