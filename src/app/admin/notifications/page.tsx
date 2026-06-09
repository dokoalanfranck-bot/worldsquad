import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationsClient } from './NotificationsClient'

export default async function AdminNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  // Count total subscribers
  const { count: subscriberCount } = await admin
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })

  // Fetch all users for targeting
  const { data: users } = await admin
    .from('users')
    .select('id, pseudo, nation, email')
    .order('pseudo')

  // Fetch recent logs
  const { data: logs } = await admin
    .from('push_notification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
    .then((r) => ({ data: r.data ?? [] }))

  return (
    <NotificationsClient
      subscriberCount={subscriberCount ?? 0}
      users={users ?? []}
      logs={logs ?? []}
    />
  )
}
