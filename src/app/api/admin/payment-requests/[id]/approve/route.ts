import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { creditCoins } from '@/lib/coins'
import { sendPushToUser } from '@/lib/push'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: pr } = await admin.from('payment_requests').select('*').eq('id', id).single()
  if (!pr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if (pr.status !== 'pending') return NextResponse.json({ error: 'Demande déjà traitée' }, { status: 400 })

  // Credit coins
  await creditCoins(pr.user_id, pr.coins_to_credit, `Achat ${pr.pack_name} (Orange Money/MTN)`)

  // Mark approved
  await admin.from('payment_requests').update({
    status:      'approved',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id)

  // Notify user
  await sendPushToUser(pr.user_id, {
    title: '✅ Paiement approuvé !',
    body: `Ton dépôt pour ${pr.pack_name} a été validé. ${pr.coins_to_credit.toLocaleString('fr-FR')} coins crédités !`,
    url: '/shop',
    tag: 'payment-approved',
  })

  return NextResponse.json({ success: true })
}
