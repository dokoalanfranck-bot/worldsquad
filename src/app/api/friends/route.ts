import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

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

  return NextResponse.json({ friendships: friendships ?? [] })
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

  // Check if friendship already exists
  const { data: existing } = await admin
    .from('friendships')
    .select('id, status')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),` +
      `and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`
    )
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Demande déjà envoyée ou amitié existante' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: targetId, status: 'pending' })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Erreur' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
