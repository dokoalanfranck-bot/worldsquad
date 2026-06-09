import webpush, { type PushSubscription } from 'web-push'
import { createAdminClient } from './supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
}

interface SubRow {
  id: string
  subscription: PushSubscription
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  const fullPayload = {
    icon: '/api/icons/192',
    badge: '/api/icons/192',
    url: '/dashboard',
    tag: 'general',
    ...payload,
  }

  const results = await Promise.allSettled(
    (subs as SubRow[]).map((row) =>
      webpush.sendNotification(row.subscription, JSON.stringify(fullPayload)).catch(async (err: { statusCode?: number }) => {
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', row.id)
        }
        throw err
      })
    )
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.warn(`[push] ${failed}/${subs.length} notifications failed for user ${userId}`)
  }
}

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const supabase = createAdminClient()
  const { data: subs } = await supabase.from('push_subscriptions').select('id, user_id, subscription')

  if (!subs || subs.length === 0) return

  const fullPayload = { icon: '/api/icons/192', badge: '/api/icons/192', url: '/dashboard', tag: 'broadcast', ...payload }

  await Promise.allSettled(
    (subs as SubRow[]).map((row) =>
      webpush.sendNotification(row.subscription, JSON.stringify(fullPayload)).catch(async (err: { statusCode?: number }) => {
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', row.id)
        }
      })
    )
  )
}
