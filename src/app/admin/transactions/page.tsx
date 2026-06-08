import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

interface SearchParams {
  user?: string
  type?: string
  page?: string
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createAdminClient()

  const page = parseInt(searchParams.page ?? '1') || 1
  const offset = (page - 1) * PAGE_SIZE

  // Build query — join users to get pseudo
  const { data: transactions, count } = await supabase
    .from('coin_transactions')
    .select('id, amount, reason, created_at, user:users!coin_transactions_user_id_fkey(id, pseudo)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const totalPositive = (transactions ?? []).reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0)
  const totalNegative = (transactions ?? []).reduce((s, t) => s + (t.amount < 0 ? t.amount : 0), 0)

  const prevHref = page > 1 ? `/admin/transactions?page=${page - 1}` : null
  const nextHref = page < totalPages ? `/admin/transactions?page=${page + 1}` : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bebas text-4xl text-white">TRANSACTIONS</h1>
        <p className="text-white/50 text-sm mt-1">{count ?? 0} transactions · Page {page}/{totalPages}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Total transactions</p>
          <p className="text-2xl font-bold text-white">{(count ?? 0).toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Entrées (page)</p>
          <p className="text-2xl font-bold text-green-400">+{totalPositive.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Sorties (page)</p>
          <p className="text-2xl font-bold text-red-400">{totalNegative.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Utilisateur</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-left">Raison</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions?.map((t) => {
                const user = t.user as unknown as { id: string; pseudo: string } | null
                return (
                  <tr key={t.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                      {new Date(t.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {user ? (
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-white hover:text-blue-300 transition-colors font-medium text-xs"
                        >
                          {user.pseudo}
                        </Link>
                      ) : (
                        <span className="text-white/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-bold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs max-w-[300px] truncate">
                      {t.reason ?? '—'}
                    </td>
                  </tr>
                )
              })}
              {(!transactions || transactions.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-white/30 text-sm">
                    Aucune transaction
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-white/40 text-xs">
              Page {page} / {totalPages} · {count ?? 0} transactions
            </p>
            <div className="flex items-center gap-2">
              {prevHref ? (
                <Link
                  href={prevHref}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              ) : (
                <span className="p-1.5 rounded-lg bg-white/5 text-white/20 cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </span>
              )}
              {nextHref ? (
                <Link
                  href={nextHref}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="p-1.5 rounded-lg bg-white/5 text-white/20 cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
