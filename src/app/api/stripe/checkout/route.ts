import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'


const PACKS = {
  starter: { name: 'Pack Starter', price: 299, coins: 1000 },
  fan: { name: 'Pack Fan', price: 699, coins: 3000 },
  ultra: { name: 'Pack Ultra', price: 1499, coins: 8000 },
  vip: { name: 'VIP WorldSquad', price: 999, coins: 0 },
} as const

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { packType } = await req.json() as { packType: keyof typeof PACKS }
  const pack = PACKS[packType]
  if (!pack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: pack.price,
          product_data: { name: pack.name, description: `WorldSquad â€” ${pack.coins > 0 ? `${pack.coins} SquadCoins` : 'AccÃ¨s VIP'}` },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      packType,
      coinsGranted: String(pack.coins),
    },
    success_url: `${appUrl}/shop?success=1`,
    cancel_url: `${appUrl}/shop?cancel=1`,
  })

  const admin = createAdminClient()
  await admin.from('purchases').insert({
    user_id: user.id,
    stripe_session_id: session.id,
    pack_type: packType,
    coins_granted: pack.coins,
    amount_paid: pack.price,
    status: 'pending',
  })

  return NextResponse.json({ url: session.url })
}
