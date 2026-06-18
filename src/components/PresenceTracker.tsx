'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function getPageInfo(path: string): { label: string; color: string } {
  if (path === '/dashboard')               return { label: 'Dashboard',      color: 'bg-blue-500/20 text-blue-300' }
  if (path === '/battles')                 return { label: 'Lobby Battles',  color: 'bg-yellow-500/20 text-yellow-300' }
  if (path.startsWith('/battles/duel/'))   return { label: 'Battle ⚔️',      color: 'bg-red-500/20 text-red-300' }
  if (path.startsWith('/battles/penalty/'))return { label: 'Tirs au but ⚽', color: 'bg-green-500/20 text-green-300' }
  if (path.startsWith('/battles/tournament/')) return { label: 'Tournoi 🏆', color: 'bg-orange-500/20 text-orange-300' }
  if (path.startsWith('/collection'))      return { label: 'Collection',     color: 'bg-purple-500/20 text-purple-300' }
  if (path.startsWith('/store'))           return { label: 'Boutique',       color: 'bg-teal-500/20 text-teal-300' }
  if (path.startsWith('/profile'))         return { label: 'Profil',         color: 'bg-zinc-500/20 text-zinc-300' }
  if (path.startsWith('/leaderboard'))     return { label: 'Classement',     color: 'bg-amber-500/20 text-amber-300' }
  if (path.startsWith('/social'))          return { label: 'Social',         color: 'bg-pink-500/20 text-pink-300' }
  if (path.startsWith('/missions'))        return { label: 'Missions',       color: 'bg-indigo-500/20 text-indigo-300' }
  return { label: 'App', color: 'bg-white/10 text-white/40' }
}

interface Props {
  userId: string
  pseudo: string
  nation: string
  photoUrl: string | null
}

export function PresenceTracker({ userId, pseudo, nation, photoUrl }: Props) {
  const pathname = usePathname()
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)

  // Create the channel once on mount
  useEffect(() => {
    const ch = supabase.channel('global-presence', {
      config: { presence: { key: userId } },
    })
    channelRef.current = ch

    ch.on('presence', { event: 'sync' }, () => {}).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { label } = getPageInfo(pathname)
        await ch.track({ userId, pseudo, nation, photoUrl, path: pathname, page: label, online_at: new Date().toISOString() })
      }
    })

    return () => {
      ch.untrack()
      supabase.removeChannel(ch)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update presence on every navigation
  useEffect(() => {
    if (!channelRef.current) return
    const { label } = getPageInfo(pathname)
    channelRef.current.track({ userId, pseudo, nation, photoUrl, path: pathname, page: label, online_at: new Date().toISOString() })
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
