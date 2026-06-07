import { createAdminClient } from './supabase/admin'
import { PACK_CONFIGS } from '@/types'
import type { Card, CardRarity } from '@/types'

type PackType = keyof typeof PACK_CONFIGS

function rollRarity(odds: Record<CardRarity, number>): CardRarity {
  const roll = Math.random()
  let cumulative = 0
  for (const [rarity, chance] of Object.entries(odds) as [CardRarity, number][]) {
    cumulative += chance
    if (roll < cumulative) return rarity
  }
  return 'Common'
}

export async function openPack(
  userId: string,
  packType: PackType
): Promise<{ cards: Card[]; error?: string }> {
  const supabase = createAdminClient()
  const config = PACK_CONFIGS[packType]

  const cards: Card[] = []

  for (let i = 0; i < config.cards; i++) {
    const rarity = rollRarity(config.odds as Record<CardRarity, number>)

    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('rarity', rarity)
      .neq('type', 'trophy')
      .order('random()')
      .limit(1)
      .single()

    if (data) cards.push(data as Card)
  }

  if (cards.length === 0) return { cards: [], error: 'Aucune carte trouvée' }

  await supabase.from('user_cards').insert(
    cards.map((card) => ({
      user_id: userId,
      card_id: card.id,
      obtained_via: 'pack',
    }))
  )

  return { cards }
}
