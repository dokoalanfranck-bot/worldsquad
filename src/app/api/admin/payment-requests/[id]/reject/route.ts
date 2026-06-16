import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { note } = await req.json() as { note?: string }

  const { data: pr } = await admin.from('payment_requests').select('*').eq('id', id).single()
  if (!pr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if (pr.status !== 'pending') return NextResponse.json({ error: 'Demande déjà traitée' }, { status: 400 })

  await admin.from('payment_requests').update({
    status:      'rejected',
    admin_note:  note ?? null,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id)

  await sendPushToUser(pr.user_id, {
    title: '❌ Paiement rejeté',
    body: note ? `Ton dépôt a été rejeté. Raison : ${note}` : 'Ton dépôt n\'a pas pu être validé. Contacte un admin.',
    url: '/shop',
    tag: 'payment-rejected',
  })

  return NextResponse.json({ success: true })
}
