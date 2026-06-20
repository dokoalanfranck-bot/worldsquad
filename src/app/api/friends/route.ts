import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: friendships } = await admin
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Enrich with user profiles via separate query to avoid ambiguous FK join
  const userIds = new Set<string>()
  for (const f of friendships ?? []) {
    if (f.requester_id) userIds.add(f.requester_id)
    if (f.addressee_id) userIds.add(f.addressee_id)
  }

  const { data: users } = userIds.size > 0
    ? await admin.from('users').select('id, pseudo, nation, photo_url, last_seen_at').in('id', Array.from(userIds))
    : { data: [] }

  const usersMap = new Map((users ?? []).map((u) => [u.id, u]))

  const enriched = (friendships ?? []).map((f) => ({
    ...f,
    requester: usersMap.get(f.requester_id) ?? { id: f.requester_id, pseudo: '?', nation: '', photo_url: null, last_seen_at: null },
    addressee: usersMap.get(f.addressee_id) ?? { id: f.addressee_id, pseudo: '?', nation: '', photo_url: null, last_seen_at: null },
  }))

  return NextResponse.json({ friendships: enriched })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { targetId } = await req.json() as { targetId: string }
  if (!targetId || targetId === user.id) {
    return NextResponse.json({ error: 'targetId invalide' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check both directions — only block on active states (pending / accepted)
  // A declined friendship must NOT block a new request
  const [{ data: dir1 }, { data: dir2 }] = await Promise.all([
    admin.from('friendships').select('id').eq('requester_id', user.id).eq('addressee_id', targetId).in('status', ['pending', 'accepted']).limit(1),
    admin.from('friendships').select('id').eq('requester_id', targetId).eq('addressee_id', user.id).in('status', ['pending', 'accepted']).limit(1),
  ])

  if ((dir1 && dir1.length > 0) || (dir2 && dir2.length > 0)) {
    return NextResponse.json({ error: 'Demande déjà envoyée ou amitié existante' }, { status: 409 })
  }

  // Clean up any lingering declined rows before inserting a fresh request
  await admin.from('friendships')
    .delete()
    .eq('requester_id', user.id)
    .eq('addressee_id', targetId)
    .eq('status', 'declined')

  const { data, error } = await admin
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: targetId, status: 'pending' })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Erreur' }, { status: 500 })
  }

  // Fetch sender pseudo for the push notification
  const { data: sender } = await admin.from('users').select('pseudo').eq('id', user.id).single()

  await sendPushToUser(targetId, {
    title: `👋 Nouvelle demande d'ami`,
    body: `${sender?.pseudo ?? 'Quelqu\'un'} veut être ton ami !`,
    url: '/social',
  })

  return NextResponse.json({ id: data.id })
}
