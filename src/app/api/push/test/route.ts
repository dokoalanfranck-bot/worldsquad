import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    await sendPushToUser(user.id, {
      title: '⚽ Test WorldSquad',
      body: 'Les notifications push fonctionnent correctement !',
      tag: 'test',
      url: '/dashboard',
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push test]', err)
    return NextResponse.json({ error: 'Erreur envoi push' }, { status: 500 })
  }
}
