import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const subscription = await req.json()
  if (!subscription?.endpoint) return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint: subscription.endpoint, subscription },
    { onConflict: 'endpoint' }
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'Endpoint manquant' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
