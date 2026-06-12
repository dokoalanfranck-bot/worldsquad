import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MusicAdminClient } from './MusicAdminClient'

export const dynamic = 'force-dynamic'

export default async function MusicAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: tracks } = await admin
    .from('music_tracks')
    .select('*')
    .order('created_at', { ascending: false })

  return <MusicAdminClient initialTracks={tracks ?? []} />
}
