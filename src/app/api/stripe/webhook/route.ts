import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'


export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' })
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const { userId, packType, coinsGranted } = session.metadata ?? {}

  if (!userId || !packType || !coinsGranted) {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const coins = parseInt(coinsGranted)

  // Get current coins
  const { data: user } = await supabase
    .from('users')
    .select('coins')
    .eq('id', userId)
    .single()

  if (user && coins > 0) {
    await Promise.all([
      supabase
        .from('users')
        .update({ coins: user.coins + coins })
        .eq('id', userId),
      supabase.from('coin_transactions').insert({
        user_id: userId,
        amount: coins,
        reason: `Achat ${packType}`,
      }),
    ])
  }

  await supabase
    .from('purchases')
    .update({ status: 'completed' })
    .eq('stripe_session_id', session.id)

  // Grant VIP if applicable
  if (packType === 'vip') {
    await supabase.from('users').update({ is_vip: true }).eq('id', userId)
  }

  return NextResponse.json({ success: true })
}
