'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Swords,
  Users,
  Trophy,
  ShoppingBag,
  Settings,
  Crown,
  Globe,
  Gift,
  type LucideIcon,
} from 'lucide-react'
import { CoinDisplay } from '@/components/ui/CoinDisplay'
import type { User } from '@/types'

const NAV_ITEMS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/matches',     icon: Calendar,        label: 'Matchs & Pronostics' },
  { href: '/collection',  icon: Layers,          label: 'Ma Collection' },
  { href: '/battles',     icon: Swords,          label: 'Battles' },
  { href: '/group',       icon: Users,           label: 'Mon Groupe' },
  { href: '/leaderboard', icon: Trophy,          label: 'Classement' },
  { href: '/shop',        icon: ShoppingBag,     label: 'Boutique' },
]

// 4 items around the center Packs button
const MOBILE_LEFT  = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Home' },
  { href: '/matches',    icon: Calendar,        label: 'Matchs' },
]
const MOBILE_RIGHT = [
  { href: '/collection', icon: Layers,          label: 'Cartes' },
  { href: '/battles',    icon: Swords,          label: 'Battles' },
]

interface SidebarProps {
  user: User
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const isPacksActive = pathname.startsWith('/packs')

  function NavItem({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
    const isActive = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors active:scale-95 ${
          isActive ? 'text-[#F5C518]' : 'text-gray-500 hover:text-gray-300'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-semibold leading-tight">{label}</span>
      </Link>
    )
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-[#0D0D17] border-r border-white/5 z-40 py-6 px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <Globe size={22} className="text-[#F5C518]" />
          <span className="text-2xl font-black text-white tracking-wider" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            WORLD<span className="text-[#F5C518]">SQUAD</span>
          </span>
        </Link>

        {/* User mini profile */}
        <div className="flex items-center gap-3 mb-8 px-2 py-3 rounded-xl bg-white/5 border border-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5C518] to-[#00D4FF] flex items-center justify-center text-black font-black text-sm overflow-hidden flex-shrink-0">
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
                  <item.icon size={18} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {user.is_vip && (
          <div className="px-2 mt-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/30">
              <Crown size={14} className="text-[#F5C518]" />
              <span className="text-[#F5C518] font-bold text-sm">Membre VIP</span>
            </div>
          </div>
        )}

        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 mt-4 text-gray-500 hover:text-gray-300 transition-colors text-sm">
          <Settings size={16} />
          Paramètres
        </Link>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D17]/95 backdrop-blur-xl border-t border-white/5"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
      >
        {/* Raised Packs button extends above nav */}
        <div className="relative flex items-end justify-around px-1">
          {/* Left items */}
          {MOBILE_LEFT.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          {/* Center: PACKS — raised button */}
          <div className="relative flex flex-col items-center flex-1 -translate-y-3">
            <Link
              href="/packs"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="flex flex-col items-center gap-0.5"
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  isPacksActive
                    ? 'bg-[#F5C518]'
                    : 'bg-[#F5C518]'
                }`}
                style={{
                  boxShadow: `0 4px 20px rgba(245,197,24,${isPacksActive ? '0.7' : '0.4'})`,
                  background: isPacksActive
                    ? 'linear-gradient(135deg, #FFD700, #F5C518)'
                    : 'linear-gradient(135deg, #F5C518, #D4A017)',
                }}
              >
                <Gift size={26} className="text-black" strokeWidth={2.5} />
              </motion.div>
              <span
                className={`text-[10px] font-black tracking-wide mt-0.5 ${isPacksActive ? 'text-[#F5C518]' : 'text-gray-400'}`}
                style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}
              >
                PACKS
              </span>
            </Link>
          </div>

          {/* Right items */}
          {MOBILE_RIGHT.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </nav>
    </>
  )
}
