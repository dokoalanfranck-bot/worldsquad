import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SocialClient } from './SocialClient'

export default async function SocialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: friendships } = await admin
    .from('friendships')
    .select(`
      id, requester_id, addressee_id, status, created_at,
      requester:users!requester_id(id, pseudo, nation, photo_url, last_seen_at),
      addressee:users!addressee_id(id, pseudo, nation, photo_url, last_seen_at)
    `)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return <SocialClient currentUserId={user.id} initialFriendships={friendships ?? []} />
}
