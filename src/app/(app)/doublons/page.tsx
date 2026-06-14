import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { DoublonsClient } from './DoublonsClient'
import type { Card } from '@/types'

export const dynamic = 'force-dynamic'

const SELL_PRICES: Record<string, number> = {
  Common: 15,
  Rare: 50,
  Epic: 150,
  Legend: 500,
}

export default async function DoublonsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: userCards } = await admin
    .from('user_cards')
    .select('card_id, obtained_at')
    .eq('user_id', user.id)
    .order('obtained_at', { ascending: true })

  // Count copies per card
  const countMap: Record<string, number> = {}
  for (const uc of userCards ?? []) {
    countMap[uc.card_id] = (countMap[uc.card_id] ?? 0) + 1
  }

  // Get card IDs with duplicates (more than 1 copy)
  const dupCardIds = Object.entries(countMap)
    .filter(([, count]) => count > 1)
    .map(([id]) => id)

  let duplicates: { card: Card; copies: number; extras: number; sellPrice: number }[] = []

  if (dupCardIds.length > 0) {
    const { data: cards } = await admin
      .from('cards')
      .select('*')
      .in('id', dupCardIds)
      .order('rarity', { ascending: false })

    duplicates = (cards ?? []).map((card) => {
      const copies = countMap[card.id] ?? 1
      const extras = copies - 1
      const sellPrice = (SELL_PRICES[card.rarity] ?? 10) * extras
      return { card: card as Card, copies, extras, sellPrice }
    }).sort((a, b) => {
      const rarityOrder: Record<string, number> = { Legend: 4, Epic: 3, Rare: 2, Common: 1 }
      return (rarityOrder[b.card.rarity] ?? 0) - (rarityOrder[a.card.rarity] ?? 0)
    })
  }

  const totalCoins = duplicates.reduce((s, d) => s + d.sellPrice, 0)

  return (
    <DoublonsClient
      duplicates={duplicates}
      totalCoins={totalCoins}
      sellPrices={SELL_PRICES}
    />
  )
}
