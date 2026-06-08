'use client'

import Link from 'next/link'
import { Plus, Users, ChevronRight } from 'lucide-react'

const FLAGS: Record<string, string> = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czech Republic': '🇨🇿',
  'Canada': '🇨🇦', 'Bosnia & Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷', 'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turkey': '🇹🇷',
  'Germany': '🇩🇪', 'Curaçao': '🇨🇼', 'Ivory Coast': '🇨🇮', 'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Sweden': '🇸🇪', 'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
  'Spain': '🇪🇸', 'Cape Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾',
  'France': '🇫🇷', 'Senegal': '🇸🇳', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Argentina': '🇦🇷', 'Algeria': '🇩🇿', 'Austria': '🇦🇹', 'Jordan': '🇯🇴',
  'Portugal': '🇵🇹', 'DR Congo': '🇨🇩', 'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Ghana': '🇬🇭', 'Panama': '🇵🇦',
}

interface TeamRow {
  name: string
  playerCount: number
}

export function TeamsGridClient({ teams }: { teams: TeamRow[] }) {
  const totalCards = teams.reduce((s, t) => s + t.playerCount, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-4xl text-white">CARTES</h1>
          <p className="text-white/40 text-sm mt-0.5">
            <span className="text-white font-semibold">{teams.length}</span> équipes ·{' '}
            <span className="text-white font-semibold">{totalCards.toLocaleString()}</span> cartes joueurs · cliquez pour voir la sélection
          </p>
        </div>
        <Link
          href="/admin/cards/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle carte
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {teams.map((team) => (
          <Link
            key={team.name}
            href={`/admin/cards?team=${encodeURIComponent(team.name)}`}
            className="glass rounded-xl p-4 hover:bg-white/[0.08] active:scale-95 transition-all group flex flex-col cursor-pointer"
          >
            <span className="text-3xl mb-2 block leading-none">{FLAGS[team.name] ?? '🏳️'}</span>
            <p className="text-white font-semibold text-sm leading-tight flex-1">{team.name}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-white/35 text-xs flex items-center gap-1">
                <Users className="w-3 h-3" />
                {team.playerCount}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
