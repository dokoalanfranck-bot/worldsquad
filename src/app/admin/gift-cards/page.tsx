import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GiftCardsClient } from './GiftCardsClient'

export const dynamic = 'force-dynamic'

export default async function GiftCardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  return <GiftCardsClient />
}
