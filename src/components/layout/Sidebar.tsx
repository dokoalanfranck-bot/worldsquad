'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { CoinDisplay } from '@/components/ui/CoinDisplay'
import type { User } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/matches', icon: '⚽', label: 'Matchs & Pronostics' },
  { href: '/collection', icon: '🃏', label: 'Ma Collection' },
  { href: '/battles', icon: '⚔️', label: 'Battles' },
  { href: '/group', icon: '👥', label: 'Mon Groupe' },
  { href: '/leaderboard', icon: '🏆', label: 'Classement' },
  { href: '/shop', icon: '🪙', label: 'Boutique' },
]

interface SidebarProps {
  user: User
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-[#0D0D17] border-r border-white/5 z-40 py-6 px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <span className="text-2xl">⚽</span>
          <span
            className="text-2xl font-black text-white tracking-wider"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            WORLD<span className="text-[#F5C518]">SQUAD</span>
          </span>
        </Link>

        {/* User mini profile */}
        <div className="flex items-center gap-3 mb-8 px-2 py-3 rounded-xl bg-white/5 border border-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5C518] to-[#00D4FF] flex items-center justify-center text-black font-black text-sm overflow-hidden">
            {user.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo_url} alt={user.pseudo} className="w-full h-full object-cover" />
            ) : (
              user.pseudo.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{user.pseudo}</p>
            <CoinDisplay amount={user.coins} size="sm" animated={false} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F5C518]"
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* VIP badge */}
        {user.is_vip && (
          <div className="px-2 mt-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/30">
              <span>👑</span>
              <span className="text-[#F5C518] font-bold text-sm">Membre VIP</span>
            </div>
          </div>
        )}

        {/* Settings link */}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 mt-4 text-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          <span>⚙️</span>
          Paramètres
        </Link>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D17]/95 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-[#F5C518]' : 'text-gray-500'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium leading-tight">
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
