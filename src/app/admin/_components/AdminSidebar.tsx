'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Globe,
  Calendar,
  Users,
  Layers,
  UsersRound,
  Swords,
  ArrowLeftRight,
  ArrowLeft,
  Shield,
  Menu,
  X,
  Bell,
  Radio,
  Music,
  Activity,
  Video,
  Zap,
  CreditCard,
  Target,
  Gift,
  Settings,
  Crown,
  Film,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', icon: LayoutDashboard, label: "Vue d'ensemble" },
  { href: '/admin/tracking', icon: Activity, label: 'Tracking' },
  { href: '/admin/live', icon: Radio, label: 'Live Control' },
  { href: '/admin/teams', icon: Globe, label: 'Équipes & Groupes' },
  { href: '/admin/matches', icon: Calendar, label: 'Matchs' },
  { href: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { href: '/admin/cards', icon: Layers, label: 'Cartes' },
  { href: '/admin/groups', icon: UsersRound, label: 'Groupes privés' },
  { href: '/admin/battles', icon: Swords, label: 'Battles' },
  { href: '/admin/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications Push' },
  { href: '/admin/music', icon: Music, label: 'Musique' },
  { href: '/admin/flash-challenges', icon: Zap, label: 'Défis Flash' },
  { href: '/admin/highlights', icon: Film, label: 'Résumés Vidéo' },
  { href: '/admin/pub', icon: Video, label: 'Espace Pub' },
  { href: '/admin/shop', icon: CreditCard, label: 'Paiements' },
  { href: '/admin/missions', icon: Target, label: 'Missions du jour' },
  { href: '/admin/gift-cards', icon: Gift, label: 'Envoyer des cartes' },
  { href: '/admin/settings', icon: Settings, label: 'Paramètres modes' },
]

interface AdminSidebarProps {
  pseudo: string
  isSuperAdmin?: boolean
}

export function AdminSidebar({ pseudo, isSuperAdmin }: AdminSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="font-bebas text-lg text-blue-400 leading-none">ADMIN</p>
            <p className="text-xs text-white/40">WorldSquad</p>
          </div>
        </div>
        <p className="text-sm text-white/60 mt-3">
          Connecté en tant que <span className="text-white font-medium">{pseudo}</span>
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
        {isSuperAdmin && (
          <Link
            href="/admin/super"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mt-2 ${
              isActive('/admin/super')
                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25'
                : 'text-yellow-500/60 hover:text-yellow-400 hover:bg-yellow-500/8'
            }`}
          >
            <Crown className="w-4 h-4 flex-shrink-0" />
            <span>Super Admin</span>
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← App</span>
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col glass border-r border-white/5 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="font-bebas text-blue-400 text-lg">ADMIN</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50 glass border-r border-white/5 flex flex-col">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Mobile top spacing */}
      <div className="lg:hidden h-14" />
    </>
  )
}
