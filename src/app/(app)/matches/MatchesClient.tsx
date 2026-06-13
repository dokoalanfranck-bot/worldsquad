'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, Calendar, Users, Filter, Circle, Zap } from 'lucide-react'
import type { Match, Prediction } from '@/types'

type FilterKey = 'all' | 'mine' | 'today' | 'group' | 'knockout'

interface Props {
  matches: Match[]
  predictionsByMatch: Record<string, Prediction>
  userNation: string
  flashMatchIds?: Set<string>
}

function MatchCard({
  match,
  prediction,
  userNation,
  isFlash,
}: {
  match: Match
  prediction?: Prediction
  userNation: string
  isFlash: boolean
}) {
  const isMyNation = match.team_a === userNation || match.team_b === userNation

  return (
    <Link href={`/matches/${match.id}`}>
      <motion.div
        whileTap={{ scale: 0.99 }}
        className={`glass rounded-2xl p-4 border transition-all cursor-pointer relative overflow-hidden ${
          isFlash
            ? 'border-[#F5C518]/40 hover:border-[#F5C518]/60'
            : isMyNation
            ? 'border-[#F5C518]/20 hover:border-[#F5C518]/35'
            : 'border-white/5 hover:border-white/10'
        }`}
        style={isFlash ? { boxShadow: '0 0 24px rgba(245,197,24,0.12)' } : undefined}
      >
        {/* Flash top stripe */}
        {isFlash && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: 'linear-gradient(90deg, #C8102E, #F5C518, #C8102E)', backgroundSize: '200%' }}
            animate={{ backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {match.group_name && (
              <span className="text-[10px] font-bold text-white/30 uppercase">Groupe {match.group_name}</span>
            )}
            {isMyNation && !isFlash && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#F5C518] bg-[#F5C518]/10 px-2 py-0.5 rounded-full">
                <Star size={8} fill="currentColor" /> Ta nation
              </span>
            )}
            {isFlash && (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="flex items-center gap-1 text-[10px] font-black text-[#F5C518] bg-[#F5C518]/15 px-2 py-0.5 rounded-full"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                <Zap size={8} fill="currentColor" /> DÉFI FLASH
              </motion.span>
            )}
          </div>
          <div>
            {match.status === 'live' ? (
              <span className="flex items-center gap-1.5 text-[10px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse">
                <Circle size={6} fill="currentColor" /> LIVE
              </span>
            ) : match.status === 'finished' ? (
              <span className="text-[10px] font-bold text-white/25 bg-white/5 px-2 py-0.5 rounded-full">Terminé</span>
            ) : (
              <span className="text-[10px] font-bold text-white/25 bg-white/5 px-2 py-0.5 rounded-full">À venir</span>
            )}
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <div className="text-3xl mb-1">{match.flag_a ?? '🏳'}</div>
            <div className="text-white font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{match.team_a}</div>
          </div>
          <div className="px-4 text-center min-w-[80px]">
            {match.status !== 'upcoming' && match.score_a !== null ? (
              <div
                className={`text-2xl font-black tabular-nums ${match.status === 'live' ? 'text-red-400' : 'text-white'}`}
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {match.score_a} — {match.score_b}
              </div>
            ) : (
              <div className="text-xs text-white/30 font-semibold text-center">
                {new Date(match.match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                <br />
                {new Date(match.match_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <div className="flex-1 text-center">
            <div className="text-3xl mb-1">{match.flag_b ?? '🏳'}</div>
            <div className="text-white font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{match.team_b}</div>
          </div>
        </div>

        {/* Prediction or CTA */}
        {prediction ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <span className="text-white/30">Mon prono :</span>
            <span className="text-[#F5C518] font-bold">{prediction.pred_score_a} — {prediction.pred_score_b}</span>
            {prediction.status !== 'pending' && (
              <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                prediction.status === 'correct_score' ? 'text-green-400 bg-green-500/10' :
                prediction.status === 'correct_winner' ? 'text-blue-400 bg-blue-500/10' :
                'text-red-400 bg-red-500/10'
              }`}>
                {prediction.status === 'correct_score' ? '+300' : prediction.status === 'correct_winner' ? '+100' : 'Raté'}
              </span>
            )}
          </div>
        ) : match.status === 'upcoming' ? (
          <div className="mt-3 text-center">
            {isFlash ? (
              <span className="text-[10px] font-black text-[#F5C518] flex items-center justify-center gap-1">
                <Zap size={9} fill="currentColor" /> Pronostiquer · Bonus coins →
              </span>
            ) : (
              <span className="text-[10px] text-[#F5C518] font-bold">Pronostiquer →</span>
            )}
          </div>
        ) : null}
      </motion.div>
    </Link>
  )
}

const FILTERS: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Tous', icon: <Filter size={11} /> },
  { key: 'mine', label: 'Ma nation', icon: <Star size={11} /> },
  { key: 'today', label: "Aujourd'hui", icon: <Calendar size={11} /> },
  { key: 'group', label: 'Groupes', icon: <Users size={11} /> },
  { key: 'knockout', label: 'Knockout', icon: null },
]

export function MatchesClient({ matches, predictionsByMatch, userNation, flashMatchIds }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const todayStr = new Date().toDateString()
  const flashIds = flashMatchIds ?? new Set<string>()

  const filtered = matches.filter((m) => {
    if (filter === 'mine') return m.team_a === userNation || m.team_b === userNation
    if (filter === 'today') return new Date(m.match_date).toDateString() === todayStr
    if (filter === 'group') return m.phase === 'group'
    if (filter === 'knockout') return m.phase !== 'group'
    return true
  })

  // Flash matches first within each day
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aFlash = flashIds.has(a.id) ? -1 : 0
    const bFlash = flashIds.has(b.id) ? -1 : 0
    return aFlash - bFlash
  })

  const grouped = sortedFiltered.reduce((acc, m) => {
    const key = new Date(m.match_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return { ...acc, [key]: [...(acc[key] ?? []), m] }
  }, {} as Record<string, Match[]>)

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto pb-28">
      <div className="mb-6">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">WorldSquad</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Calendar size={22} className="text-violet-400" />
          </div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>MATCHS</h1>
        </div>
        <p className="text-white/30 text-sm mt-2">104 matchs · FIFA World Cup 2026</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === f.key ? 'bg-[#F5C518] text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/5'
            }`}
          >
            {f.icon}{f.label}
          </button>
        ))}
      </div>

      {/* Match list */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, dayMatches]) => (
          <div key={date}>
            <h2 className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-3 capitalize flex items-center gap-2">
              {date} <span className="text-white/15">({dayMatches.length})</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {dayMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predictionsByMatch[match.id]}
                  userNation={userNation}
                  isFlash={flashIds.has(match.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <Calendar size={30} className="text-violet-400/40" />
            </div>
            <p className="text-white/30 text-sm">Aucun match pour ce filtre</p>
          </div>
        )}
      </div>
    </div>
  )
}
