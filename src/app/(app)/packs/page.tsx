import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PacksClient } from './PacksClient'

export const dynamic = 'force-dynamic'

export default async function PacksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('coins, pseudo')
    .eq('id', user.id)
    .single()

  return <PacksClient initialCoins={profile?.coins ?? 0} pseudo={profile?.pseudo ?? ''} />
}
