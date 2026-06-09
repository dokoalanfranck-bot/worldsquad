import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser, sendPushToAll } from '@/lib/push'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { title, body, url, tag, audience, user_ids } = await req.json()

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Titre et message requis' }, { status: 400 })
  }

  const payload = {
    title: title.trim(),
    body: body.trim(),
    url: url?.trim() || '/dashboard',
    tag: tag || 'admin',
    icon: '/api/icons/192',
    badge: '/api/icons/192',
  }

  let sent = 0

  if (audience === 'all') {
    await sendPushToAll(payload)
    // Count subscriptions to report
    const { count } = await admin
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
    sent = count ?? 0
  } else if (audience === 'specific' && Array.isArray(user_ids) && user_ids.length > 0) {
    await Promise.allSettled(
      user_ids.map((uid: string) => sendPushToUser(uid, payload).then(() => { sent++ }))
    )
  } else {
    return NextResponse.json({ error: 'Audience invalide' }, { status: 400 })
  }

  // Log in DB
  await admin.from('push_notification_logs').insert({
    sent_by: user.id,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    audience,
    recipients_count: sent,
  }).then(() => {}) // ignore if table doesn't exist yet

  return NextResponse.json({ ok: true, sent })
}
