import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface SearchParams {
  status?: string
}

const STATUSES = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'finished', label: 'Terminé' },
  { value: 'declined', label: 'Refusé' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10',
  accepted: 'text-blue-400 bg-blue-500/10',
  finished: 'text-green-400 bg-green-500/10',
  declined: 'text-red-400 bg-red-500/10',
}

export default async function AdminBattlesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createAdminClient()
  const status = searchParams.status

  let query = supabase
    .from('battles')
    .select(`
      id,
      coins_stake,
      status,
      winner_id,
      stat_compared,
      created_at,
      challenger:users!battles_challenger_id_fkey(id, pseudo),
      opponent:users!battles_opponent_id_fkey(id, pseudo),
      challenger_card:cards!battles_challenger_card_id_fkey(name, rarity),
      opponent_card:cards!battles_opponent_card_id_fkey(name, rarity)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: battles } = await query

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bebas text-4xl text-white">BATTLES</h1>
        <p className="text-white/50 text-sm mt-1">{battles?.length ?? 0} battles</p>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={s.value === 'all' ? '/admin/battles' : `/admin/battles?status=${s.value}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              (status ?? 'all') === s.value
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Challenger</th>
                <th className="px-4 py-3 text-left">Opponent</th>
                <th className="px-4 py-3 text-right">Mise</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Carte A</th>
                <th className="px-4 py-3 text-left">Carte B</th>
                <th className="px-4 py-3 text-left">Gagnant</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {battles?.map((battle) => {
                const challenger = battle.challenger as unknown as { id: string; pseudo: string } | null
                const opponent = battle.opponent as unknown as { id: string; pseudo: string } | null
                const challengerCard = battle.challenger_card as unknown as { name: string; rarity: string } | null
                const opponentCard = battle.opponent_card as unknown as { name: string; rarity: string } | null

                const winner = battle.winner_id === challenger?.id
                  ? challenger?.pseudo
                  : battle.winner_id === opponent?.id
                  ? opponent?.pseudo
                  : null

                return (
                  <tr key={battle.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{challenger?.pseudo ?? '—'}</td>
                    <td className="px-4 py-3 text-white/70">{opponent?.pseudo ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-yellow-400">
                      {(battle.coins_stake ?? 0).toLocaleString()} 🪙
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[battle.status] ?? 'text-white/40'}`}>
                        {battle.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs max-w-[120px] truncate">
                      {challengerCard?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs max-w-[120px] truncate">
                      {opponentCard?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {winner ? (
                        <span className="text-green-400 font-medium text-xs">🏆 {winner}</span>
                      ) : (
                        <span className="text-white/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                      {new Date(battle.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                )
              })}
              {(!battles || battles.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-white/30 text-sm">
                    Aucune battle trouvée
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
