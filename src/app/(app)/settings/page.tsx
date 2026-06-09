import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@/types'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!profile) redirect('/login')

  const [{ count: cardCount }, { data: membership }] = await Promise.all([
    supabase
      .from('user_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUser.id),
    supabase
      .from('group_members')
      .select('group:groups(id, name, code, creator_id)')
      .eq('user_id', authUser.id)
      .single(),
  ])

  type GroupInfo = { id: string; name: string; code: string; creator_id: string | null }
  const group = (membership?.group as unknown as GroupInfo) ?? null

  return (
    <SettingsClient
      user={profile as User}
      cardCount={cardCount ?? 0}
      group={group}
    />
  )
}
