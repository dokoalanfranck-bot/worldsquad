'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Search, Plus, Edit, Trash2, Loader2, Layers, Users,
  ChevronLeft, ChevronRight, Image as ImageIcon, ArrowLeft,
} from 'lucide-react'

interface Card {
  id: string
  type: string
  name: string
  rarity: string
  image_url: string | null
  stats: Record<string, number | string> | null
  description: string | null
  nation: string | null
}

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

interface CardsClientProps {
  cards: Card[]
  ownerCounts: Record<string, number>
  totalCount: number
  currentPage: number
  totalPages: number
  currentType: string
  currentRarity: string
  currentSearch: string
  team?: string
}

const TYPES = [
  { value: 'all', label: 'Tous' },
  { value: 'player', label: 'Joueur' },
  { value: 'nation', label: 'Nation' },
  { value: 'trophy', label: 'Trophée' },
  { value: 'event', label: 'Évènement' },
]

const RARITIES = [
  { value: 'all', label: 'Toutes' },
  { value: 'Common', label: 'Common' },
  { value: 'Rare', label: 'Rare' },
  { value: 'Epic', label: 'Epic' },
  { value: 'Legend', label: 'Legend' },
]

const RARITY_COLORS: Record<string, string> = {
  Common:  'text-white/60 bg-white/8',
  Rare:    'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20',
  Epic:    'text-purple-400 bg-purple-500/10 border border-purple-500/20',
  Legend:  'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20',
}

function DeleteButton({ cardId, cardName }: { cardId: string; cardName: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/cards/${cardId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression')
      toast.success(`"${cardName}" supprimée`)
      router.refresh()
    } catch {
      toast.error('Erreur')
      setLoading(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={handleDelete} disabled={loading}
          className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-500 text-white transition-colors">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Oui'}
        </button>
        <button onClick={() => setConfirm(false)}
          className="px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/15 text-white/50 transition-colors">
          Non
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="p-1.5 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
      <Trash2 className="w-3 h-3" />
    </button>
  )
}

export function CardsClient({
  cards, ownerCounts, totalCount, currentPage, totalPages,
  currentType, currentRarity, currentSearch, team,
}: CardsClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch)
  const [, startTransition] = useTransition()

  const navigate = (updates: Record<string, string | number>) => {
    const params = new URLSearchParams()
    const type   = String(updates.type   ?? currentType)
    const rarity = String(updates.rarity ?? currentRarity)
    const q      = updates.search !== undefined ? String(updates.search) : search
    const p      = String(updates.page ?? 1)

    if (team)             params.set('team', team)
    if (type   !== 'all' && !team) params.set('type', type)
    if (rarity !== 'all') params.set('rarity', rarity)
    if (q)                params.set('search', q)
    if (p !== '1')        params.set('page', p)

    startTransition(() => router.push(`/admin/cards?${params.toString()}`))
  }

  const flag = team ? (FLAGS[team] ?? '🏳️') : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {team && (
            <Link href="/admin/cards"
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            {team ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30 font-medium uppercase tracking-widest">Cartes</span>
                  <span className="text-white/20">/</span>
                  <span className="text-xs text-white/50 font-medium uppercase tracking-widest">{flag} {team}</span>
                </div>
                <h1 className="font-bebas text-4xl text-white mt-0.5">{flag} {team}</h1>
              </>
            ) : (
              <h1 className="font-bebas text-4xl text-white">CARTES</h1>
            )}
            <p className="text-white/40 text-sm mt-0.5">
              <span className="text-white font-semibold">{totalCount.toLocaleString()}</span> cartes ·
              page <span className="text-white font-semibold">{currentPage}</span> / {totalPages}
            </p>
          </div>
        </div>
        <Link href="/admin/cards/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" />
          Nouvelle carte
        </Link>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        {/* Type — masqué en mode équipe */}
        {!team && (
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button key={t.value} onClick={() => navigate({ type: t.value, page: 1 })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentType === t.value
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        {/* Rarity */}
        <div className="flex flex-wrap gap-1.5">
          {RARITIES.map((r) => (
            <button key={r.value} onClick={() => navigate({ rarity: r.value, page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentRarity === r.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); navigate({ search: e.target.value, page: 1 }) }}
            placeholder={team ? `Rechercher dans ${team}…` : 'Rechercher carte…'}
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/30 text-[11px] uppercase tracking-wider">
                <th className="px-3 py-3 text-left w-10">Img</th>
                <th className="px-3 py-3 text-left">Nom</th>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-left">Rareté</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Stats (aperçu)</th>
                <th className="px-3 py-3 text-center w-16">Prop.</th>
                <th className="px-3 py-3 text-left w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {cards.map((card) => {
                const statsPreview = card.stats
                  ? Object.entries(card.stats)
                      .filter(([k]) => k !== 'position')
                      .slice(0, 4)
                      .map(([k, v]) => `${k.toUpperCase().slice(0, 3)} ${v}`)
                      .join(' · ')
                  : '—'
                return (
                  <tr key={card.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5">
                      {card.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.image_url} alt={card.name}
                          className="w-9 h-9 rounded-lg object-contain bg-white/5"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-white/15" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-white font-medium text-sm leading-tight">{card.name}</p>
                      {card.nation && <p className="text-white/30 text-xs">{card.nation}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-white/50 text-xs capitalize">{card.type}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${RARITY_COLORS[card.rarity] ?? 'text-white/50'}`}>
                        {card.rarity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-white/30 text-xs font-mono">{statsPreview}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-white/40 text-xs">
                        <Users className="w-3 h-3" />
                        {ownerCounts[card.id] ?? 0}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/cards/${card.id}`}
                          className="p-1.5 rounded text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                          <Edit className="w-3 h-3" />
                        </Link>
                        <DeleteButton cardId={card.id} cardName={card.name} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {cards.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Layers className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-white/30 text-sm">Aucune carte trouvée</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-white/30 text-xs">
              {((currentPage - 1) * 100 + 1).toLocaleString()}–{Math.min(currentPage * 100, totalCount).toLocaleString()} sur {totalCount.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate({ page: currentPage - 1 })}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Préc.
              </button>
              {/* Page numbers — show up to 5 around current */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
                const p = start + i
                return (
                  <button key={p} onClick={() => navigate({ page: p })}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      p === currentPage
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                    }`}>
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => navigate({ page: currentPage + 1 })}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Suiv. <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
