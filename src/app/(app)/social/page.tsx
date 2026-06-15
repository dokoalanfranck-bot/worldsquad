import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SocialClient } from './SocialClient'

export default async function SocialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Fetch friendships without the ambiguous FK join syntax
  const { data: friendships } = await admin
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Collect all unique user IDs to enrich
  const userIds = new Set<string>()
  for (const f of friendships ?? []) {
    if (f.requester_id) userIds.add(f.requester_id)
    if (f.addressee_id) userIds.add(f.addressee_id)
  }

  const { data: users } = userIds.size > 0
    ? await admin.from('users').select('id, pseudo, nation, photo_url').in('id', Array.from(userIds))
    : { data: [] }

  const usersMap = new Map((users ?? []).map((u) => [u.id, u]))

  const enriched = (friendships ?? []).map((f) => ({
    ...f,
    requester: usersMap.get(f.requester_id) ?? { id: f.requester_id, pseudo: '?', nation: '', photo_url: null, last_seen_at: null },
    addressee: usersMap.get(f.addressee_id) ?? { id: f.addressee_id, pseudo: '?', nation: '', photo_url: null, last_seen_at: null },
  }))

  return <SocialClient currentUserId={user.id} initialFriendships={enriched} />
}
