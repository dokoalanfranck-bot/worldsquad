import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { creditCoins } from '@/lib/coins'

const SELL_PRICES: Record<string, number> = {
  Common: 15,
  Rare: 50,
  Epic: 150,
  Legend: 500,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { cardId, quantity = 1 } = await req.json() as { cardId: string; quantity: number }
  if (!cardId || quantity < 1) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

  const admin = createAdminClient()

  // Get card details (rarity)
  const { data: card } = await admin.from('cards').select('id, name, rarity').eq('id', cardId).single()
  if (!card) return NextResponse.json({ error: 'Carte introuvable' }, { status: 404 })

  // Check how many copies the user owns
  const { data: copies } = await admin
    .from('user_cards')
    .select('id')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .order('obtained_at', { ascending: true })

  if (!copies || copies.length < 2) {
    return NextResponse.json({ error: 'Impossible de vendre la dernière copie' }, { status: 400 })
  }

  // Max sellable = copies - 1 (keep at least 1)
  const maxSellable = copies.length - 1
  const toSell = Math.min(quantity, maxSellable)
  if (toSell < 1) return NextResponse.json({ error: 'Aucun doublon à vendre' }, { status: 400 })

  // Remove the oldest copies (keep the newest ones)
  const idsToDelete = copies.slice(0, toSell).map((c) => c.id)
  await admin.from('user_cards').delete().in('id', idsToDelete)

  // Credit coins
  const priceEach = SELL_PRICES[card.rarity] ?? 10
  const coinsEarned = priceEach * toSell
  await creditCoins(user.id, coinsEarned, `Vente doublon — ${card.name} ×${toSell}`)

  // Return new coin balance
  const { data: profile } = await admin.from('users').select('coins').eq('id', user.id).single()

  return NextResponse.json({
    success: true,
    sold: toSell,
    coinsEarned,
    newBalance: profile?.coins ?? 0,
  })
}
