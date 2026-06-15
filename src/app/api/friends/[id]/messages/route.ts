import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: friendId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: messages } = await admin
    .from('friend_messages')
    .select('id, sender_id, receiver_id, text, read_at, created_at')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),` +
      `and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
    )
    .order('created_at', { ascending: true })
    .limit(50)

  // Mark received messages as read
  await admin
    .from('friend_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', friendId)
    .eq('receiver_id', user.id)
    .is('read_at', null)

  return NextResponse.json({ messages: messages ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: friendId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { text } = await req.json() as { text: string }
  const trimmed = String(text ?? '').trim().slice(0, 200)
  if (!trimmed) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('friend_messages')
    .insert({ sender_id: user.id, receiver_id: friendId, text: trimmed })
    .select('id, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Erreur' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, created_at: data.created_at })
}
