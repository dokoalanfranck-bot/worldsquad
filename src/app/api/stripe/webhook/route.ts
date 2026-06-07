import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: NextRequest) {
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

  await Promise.all([
    supabase.from('users').update({ coins: supabase.rpc as never }).eq('id', userId),
    supabase.rpc('increment_coins', { user_id: userId, delta: coins }),
    supabase.from('coin_transactions').insert({
      user_id: userId,
      amount: coins,
      reason: `Achat ${packType}`,
    }),
    supabase
      .from('purchases')
      .update({ status: 'completed' })
      .eq('stripe_session_id', session.id),
  ])

  return NextResponse.json({ success: true })
}
