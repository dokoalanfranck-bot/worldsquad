import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { SeedWorldCupButton } from './_components/SeedWorldCupButton'
import { SeedPlayersButton } from './_components/SeedPlayersButton'
import {
  Users,
  Calendar,
  Target,
  Swords,
  Layers,
  Coins,
  ArrowRight,
  Globe,
  UserPlus,
  TrendingUp,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()

  const [
    { count: usersCount },
    { count: matchesCount },
    { count: predictionsCount },
    { count: battlesCount },
    { count: cardsCount },
    { data: usersCoins },
    { data: recentUsers },
    { data: recentMatches },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('predictions').select('*', { count: 'exact', head: true }),
    supabase.from('battles').select('*', { count: 'exact', head: true }),
    supabase.from('cards').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('coins'),
    supabase
      .from('users')
      .select('id, pseudo, coins, is_vip, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('matches')
      .select('id, team_a, team_b, flag_a, flag_b, score_a, score_b, match_date, phase, status')
      .eq('status', 'finished')
      .order('match_date', { ascending: false })
      .limit(5),
  ])

  const totalCoins = usersCoins?.reduce((sum, u) => sum + (u.coins ?? 0), 0) ?? 0

  const stats = [
    { label: 'Utilisateurs', value: usersCount ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Matchs', value: matchesCount ?? 0, icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Pronostics', value: predictionsCount ?? 0, icon: Target, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Battles', value: battlesCount ?? 0, icon: Swords, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Cartes', value: cardsCount ?? 0, icon: Layers, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  ]

  const quickActions = [
    { label: 'Gérer les équipes', href: '/admin/teams', icon: Globe, desc: 'Import JSON, groupes' },
    { label: 'Gérer les matchs', href: '/admin/matches', icon: Calendar, desc: 'Scores, calculs' },
    { label: 'Gérer les utilisateurs', href: '/admin/users', icon: Users, desc: 'Coins, VIP, admin' },
    { label: 'Gérer les cartes', href: '/admin/cards', icon: Layers, desc: 'Créer, modifier' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-4xl text-white">VUE D&apos;ENSEMBLE</h1>
          <p className="text-white/50 text-sm mt-1">Tableau de bord administrateur WorldSquad</p>
        </div>
        <div className="flex items-center gap-3">
          <SeedPlayersButton />
          <SeedWorldCupButton />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="glass rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
              <p className="text-white/50 text-xs mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Coins en circulation */}
      <div className="glass rounded-xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
          <Coins className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <p className="text-white/50 text-sm">Coins en circulation</p>
          <p className="text-3xl font-bold text-yellow-400">{totalCoins.toLocaleString()}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-white/30 text-xs">Moyenne / utilisateur</p>
          <p className="text-white font-semibold">
            {usersCount ? Math.round(totalCoins / usersCount).toLocaleString() : 0}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-bebas text-xl text-white mb-4">ACTIONS RAPIDES</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="glass rounded-xl p-4 hover:bg-blue-500/5 hover:border-blue-500/20 border border-transparent transition-all group"
              >
                <Icon className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-white text-sm font-medium group-hover:text-blue-300 transition-colors">
                  {action.label}
                </p>
                <p className="text-white/40 text-xs mt-0.5">{action.desc}</p>
                <ArrowRight className="w-4 h-4 text-blue-400/0 group-hover:text-blue-400/70 transition-all mt-2" />
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-400" />
              <h2 className="font-semibold text-white text-sm">Derniers inscrits</h2>
            </div>
            <Link href="/admin/users" className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentUsers?.map((user) => (
              <div key={user.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/2 transition-colors">
                <div>
                  <p className="text-white text-sm font-medium">{user.pseudo}</p>
                  <p className="text-white/40 text-xs">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {user.is_vip && (
                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">VIP</span>
                  )}
                  <span className="text-white/60 text-sm">{(user.coins ?? 0).toLocaleString()} 🪙</span>
                </div>
              </div>
            ))}
            {!recentUsers?.length && (
              <p className="px-4 py-6 text-white/30 text-sm text-center">Aucun utilisateur</p>
            )}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h2 className="font-semibold text-white text-sm">Matchs récents terminés</h2>
            </div>
            <Link href="/admin/matches" className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentMatches?.map((match) => (
              <div key={match.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-2 text-sm">
                  <span>{match.flag_a ?? '🏳'}</span>
                  <span className="text-white/70">{match.team_a}</span>
                  <span className="font-bold text-white px-2">
                    {match.score_a} - {match.score_b}
                  </span>
                  <span className="text-white/70">{match.team_b}</span>
                  <span>{match.flag_b ?? '🏳'}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Terminé</span>
              </div>
            ))}
            {!recentMatches?.length && (
              <p className="px-4 py-6 text-white/30 text-sm text-center">Aucun match terminé</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
