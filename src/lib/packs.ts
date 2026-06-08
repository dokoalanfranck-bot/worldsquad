import { createAdminClient } from './supabase/admin'
import { PACK_CONFIGS } from '@/types'
import type { Card, CardRarity } from '@/types'

type PackType = keyof typeof PACK_CONFIGS

function rollRarity(odds: Record<string, number>): CardRarity {
  const roll = Math.random()
  let cumulative = 0
  for (const [rarity, chance] of Object.entries(odds)) {
    cumulative += chance
    if (roll < cumulative) return rarity as CardRarity
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
    const rarity = rollRarity(config.odds as Record<string, number>)

    // Fetch a random card of the required rarity
    const { data: pool } = await supabase
      .from('cards')
      .select('id')
      .eq('rarity', rarity)
      .eq('type', 'player')

    if (!pool || pool.length === 0) continue

    const randomId = pool[Math.floor(Math.random() * pool.length)].id
    const { data: card } = await supabase.from('cards').select('*').eq('id', randomId).single()
    if (card) cards.push(card as Card)
  }

  if (cards.length === 0) return { cards: [], error: 'Aucune carte disponible' }

  await supabase.from('user_cards').insert(
    cards.map((card) => ({
      user_id: userId,
      card_id: card.id,
      obtained_via: 'pack',
    }))
  )

  return { cards }
}
