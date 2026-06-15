'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, Layers, Swords, Users,
  Trophy, ShoppingBag, Settings, Crown, Globe, Gift,
  Menu, X, Shield, ChevronRight, type LucideIcon, CreditCard, Repeat2, Radio,
} from 'lucide-react'
import { CoinDisplay } from '@/components/ui/CoinDisplay'
import type { User } from '@/types'

const NAV_ITEMS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/matches',     icon: Calendar,        label: 'Matchs & Pronostics' },
  { href: '/live',        icon: Radio,           label: 'Match en Direct' },
  { href: '/collection',  icon: Layers,          label: 'Ma Collection' },
  { href: '/doublons',    icon: Repeat2,         label: 'Vendre Doublons' },
  { href: '/battles',     icon: Swords,          label: 'Battles' },
  { href: '/group',       icon: Users,           label: 'Mon Groupe' },
  { href: '/leaderboard', icon: Trophy,          label: 'Classement' },
  { href: '/shop',        icon: ShoppingBag,     label: 'Boutique' },
]

// Quick-access items in bottom bar (around center Packs)
const MOBILE_LEFT = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Home' },
  { href: '/matches',    icon: Calendar,        label: 'Matchs' },
]
const MOBILE_RIGHT = [
  { href: '/collection', icon: Layers, label: 'Cartes' },
  // Menu burger replaces the 4th slot — see below
]

// Items shown inside the burger drawer
const DRAWER_ITEMS: { href: string; icon: LucideIcon; label: string; color?: string }[] = [
  { href: '/live',         icon: Radio,        label: 'Match en Direct' },
  { href: '/battles',      icon: Swords,       label: 'Battles' },
  { href: '/doublons',     icon: Repeat2,      label: 'Vendre Doublons' },
  { href: '/group',        icon: Users,        label: 'Mon Groupe' },
  { href: '/leaderboard',  icon: Trophy,       label: 'Classement' },
  { href: '/shop',         icon: ShoppingBag,  label: 'Boutique' },
  { href: '/supporter-card', icon: CreditCard, label: 'Ma Carte Supporter' },
  { href: '/settings',     icon: Settings,     label: 'Paramètres' },
]

interface SidebarProps { user: User }

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const isPacksActive = pathname.startsWith('/packs')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const isMenuActive = DRAWER_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  ) || (user.is_admin && pathname.startsWith('/admin'))

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
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 border-r border-white/5 z-40 py-6 px-4" style={{ background: 'var(--bg-sidebar)' }}>
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <Globe size={22} className="text-[#F5C518]" />
          <span className="text-2xl font-black text-white tracking-wider" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            WORLD<span className="text-[#F5C518]">SQUAD</span>
          </span>
        </Link>

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
                  {isActive && <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F5C518]" />}
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

        {user.is_admin && (
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors text-sm font-bold">
            <Shield size={16} />
            Administration
          </Link>
        )}

        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 mt-2 text-gray-500 hover:text-gray-300 transition-colors text-sm rounded-xl hover:bg-white/5">
          <Settings size={16} />
          Paramètres
        </Link>
      </aside>

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t border-white/5"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)', background: 'rgba(6,15,26,0.95)' }}
      >
        <div className="relative flex items-end justify-around px-1">
          {/* Left */}
          {MOBILE_LEFT.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          {/* Center: PACKS raised */}
          <div className="relative flex flex-col items-center flex-1 -translate-y-3">
            <Link href="/packs" style={{ WebkitTapHighlightColor: 'transparent' }} className="flex flex-col items-center gap-0.5">
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
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

          {/* Right */}
          {MOBILE_RIGHT.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          {/* Burger button */}
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors active:scale-95 ${
              isMenuActive ? 'text-[#F5C518]' : 'text-gray-500'
            }`}
          >
            <div className="relative">
              <Menu size={21} strokeWidth={isMenuActive ? 2.5 : 2} />
              {user.is_admin && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500" />
              )}
            </div>
            <span className="text-[10px] font-semibold leading-tight">Menu</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Burger Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-y-auto"
              style={{ background: 'var(--bg-sidebar)', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
            >
              {/* Handle */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5C518] to-[#00D4FF] flex items-center justify-center text-black font-black text-sm overflow-hidden flex-shrink-0">
                    {user.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photo_url} alt={user.pseudo} className="w-full h-full object-cover" />
                    ) : (
                      user.pseudo.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm leading-none">{user.pseudo}</p>
                    <CoinDisplay amount={user.coins} size="sm" animated={false} />
                  </div>
                  {user.is_vip && (
                    <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded bg-[#F5C518]/20 text-[#F5C518]">VIP</span>
                  )}
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 mt-2"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 py-2">
                {/* Admin button — prominent if applicable */}
                {user.is_admin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-3 bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 active:scale-98 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Shield size={18} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-sm text-purple-300">Administration</p>
                      <p className="text-purple-500 text-xs">Gérer l'app</p>
                    </div>
                    <ChevronRight size={16} className="text-purple-500" />
                  </Link>
                )}

                {/* Nav items */}
                <div className="rounded-2xl overflow-hidden border border-white/5" style={{ background: 'var(--bg-elevated)' }}>
                  {DRAWER_ITEMS.map((item, i) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/10 ${
                          i < DRAWER_ITEMS.length - 1 ? 'border-b border-white/5' : ''
                        } ${isActive ? 'bg-[#F5C518]/5' : 'hover:bg-white/5'}`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-[#F5C518]/20' : 'bg-white/5'
                        }`}>
                          <item.icon size={18} className={isActive ? 'text-[#F5C518]' : 'text-gray-400'} />
                        </div>
                        <span className={`flex-1 font-semibold text-sm ${isActive ? 'text-[#F5C518]' : 'text-white'}`}>
                          {item.label}
                        </span>
                        {isActive
                          ? <div className="w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
                          : <ChevronRight size={14} className="text-gray-600" />
                        }
                      </Link>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
