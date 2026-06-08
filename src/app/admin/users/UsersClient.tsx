'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Crown,
  Shield,
  Loader2,
  Coins,
  Plus,
  Minus,
  Users,
} from 'lucide-react'

interface AdminUser {
  id: string
  pseudo: string
  email: string
  nation: string | null
  coins: number
  level: string | null
  is_vip: boolean
  is_admin: boolean
  predictions_correct: number
  battles_won: number
  created_at: string
}

interface UsersClientProps {
  users: AdminUser[]
  totalCount: number
  currentPage: number
  totalPages: number
  currentSearch: string
}

function UserRow({ user }: { user: AdminUser }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const patch = async (body: Record<string, unknown>, label: string) => {
    setLoading(label)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erreur')
      toast.success(`✓ ${label}`)
      router.refresh()
    } catch {
      toast.error('Erreur')
    } finally {
      setLoading(null)
    }
  }

  const spin = (key: string) => loading === key

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-0">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0 border border-white/10">
        <span className="text-sm font-bold text-white">{user.pseudo[0]?.toUpperCase()}</span>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/admin/users/${user.id}`} className="text-white text-sm font-semibold hover:text-blue-300 transition-colors truncate">
            {user.pseudo}
          </Link>
          {user.is_vip && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
              VIP
            </span>
          )}
          {user.is_admin && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
              ADMIN
            </span>
          )}
        </div>
        <p className="text-white/30 text-xs truncate">{user.email}</p>
      </div>

      {/* Nation */}
      <div className="hidden md:block text-white/50 text-xs w-20 text-center truncate">
        {user.nation ?? '—'}
      </div>

      {/* Stats */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-white/40">
        <span title="Pronostics corrects">🎯 {user.predictions_correct}</span>
        <span title="Battles gagnés">⚔️ {user.battles_won}</span>
      </div>

      {/* Coins */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/8 border border-yellow-500/15">
        <Coins className="w-3 h-3 text-yellow-400 flex-shrink-0" />
        <span className="text-yellow-300 font-mono text-xs font-bold w-14 text-right">
          {(user.coins ?? 0).toLocaleString()}
        </span>
      </div>

      {/* Inscrit */}
      <div className="hidden xl:block text-white/30 text-xs w-20 text-center">
        {new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => patch({ coins_delta: 500 }, '+500')}
          disabled={loading !== null}
          title="+500 coins"
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors disabled:opacity-40"
        >
          {spin('+500') ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        </button>
        <button
          onClick={() => patch({ coins_delta: -100 }, '-100')}
          disabled={loading !== null}
          title="-100 coins"
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-40"
        >
          {spin('-100') ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minus className="w-3 h-3" />}
        </button>
        <button
          onClick={() => patch({ is_vip: !user.is_vip }, user.is_vip ? 'VIP retiré' : 'VIP ajouté')}
          disabled={loading !== null}
          title={user.is_vip ? 'Retirer VIP' : 'Donner VIP'}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${
            user.is_vip
              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10'
              : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-yellow-400'
          }`}
        >
          {spin('VIP ajouté') || spin('VIP retiré') ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Crown className="w-3 h-3" />
          )}
        </button>
        <button
          onClick={() => patch({ is_admin: !user.is_admin }, user.is_admin ? 'Admin retiré' : 'Admin ajouté')}
          disabled={loading !== null}
          title={user.is_admin ? 'Retirer admin' : 'Donner admin'}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${
            user.is_admin
              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/10'
              : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-blue-400'
          }`}
        >
          {spin('Admin ajouté') || spin('Admin retiré') ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Shield className="w-3 h-3" />
          )}
        </button>
        <Link
          href={`/admin/users/${user.id}`}
          title="Voir profil"
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-colors"
        >
          <Eye className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

export function UsersClient({
  users,
  totalCount,
  currentPage,
  totalPages,
  currentSearch,
}: UsersClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch)
  const [, startTransition] = useTransition()

  const navigate = (updates: Record<string, string | number>) => {
    const params = new URLSearchParams()
    const q = updates.search !== undefined ? String(updates.search) : search
    const p = updates.page !== undefined ? String(updates.page) : '1'
    if (q) params.set('search', q)
    if (p !== '1') params.set('page', p)
    startTransition(() => router.push(`/admin/users?${params.toString()}`))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-4xl text-white">UTILISATEURS</h1>
          <p className="text-white/40 text-sm mt-0.5">
            <span className="text-white font-semibold">{totalCount}</span> inscrits au total
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              navigate({ search: e.target.value, page: 1 })
            }}
            placeholder="Rechercher un pseudo…"
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Legend row */}
      <div className="hidden md:flex items-center gap-3 px-4 py-2 text-white/25 text-[11px] uppercase tracking-wider font-semibold">
        <div className="w-9 flex-shrink-0" />
        <div className="flex-1">Pseudo</div>
        <div className="w-20 text-center">Nation</div>
        <div className="hidden lg:flex gap-4 w-28">
          <span>Prono</span>
          <span>Battle</span>
        </div>
        <div className="w-24">Coins</div>
        <div className="hidden xl:block w-20 text-center">Inscrit</div>
        <div className="w-[148px]">Actions</div>
      </div>

      {/* Users list */}
      <div className="glass rounded-2xl overflow-hidden border border-white/5">
        {users.length > 0 ? (
          users.map((user) => <UserRow key={user.id} user={user} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="w-10 h-10 text-white/10" />
            <p className="text-white/30 text-sm">Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-white/30 text-sm">
            Page <span className="text-white font-semibold">{currentPage}</span> / {totalPages}
            <span className="text-white/20 mx-2">·</span>
            {totalCount} résultats
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ page: currentPage - 1 })}
              disabled={currentPage <= 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Préc.
            </button>
            <button
              onClick={() => navigate({ page: currentPage + 1 })}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Suiv. <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
