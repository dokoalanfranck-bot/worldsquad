import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    { data: pending, error: pendingErr },
    { data: history, error: historyErr },
  ] = await Promise.all([
    admin
      .from('payment_requests')
      .select('*, user:user_id(pseudo, photo_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    admin
      .from('payment_requests')
      .select('*, user:user_id(pseudo, photo_url)')
      .neq('status', 'pending')
      .order('reviewed_at', { ascending: false })
      .limit(50),
  ])

  if (pendingErr) console.error('[admin/payment-requests] pending:', pendingErr.message)
  if (historyErr) console.error('[admin/payment-requests] history:', historyErr.message)

  return NextResponse.json(
    { pending: pending ?? [], history: history ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
