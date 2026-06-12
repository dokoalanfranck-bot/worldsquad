import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SupporterCardClient } from './SupporterCardClient'
import type { User } from '@/types'

export default async function SupporterCardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('*').eq('id', authUser.id).single()
  if (!profile) redirect('/signup')

  const { count: cardCount } = await admin
    .from('user_cards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', authUser.id)

  return <SupporterCardClient user={profile as User} cardCount={cardCount ?? 0} />
}
