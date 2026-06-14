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

async function pickCard(
  supabase: ReturnType<typeof createAdminClient>,
  rarity: CardRarity,
  excludeIds: Set<string>
): Promise<Card | null> {
  const buildQuery = (exclude: Set<string>) => {
    let q = supabase.from('cards').select('id').eq('rarity', rarity).eq('type', 'player')
    if (exclude.size > 0) q = q.not('id', 'in', `(${[...exclude].join(',')})`)
    return q
  }

  // 1st try: exclude all already-owned + in-pack cards
  let { data: pool } = await buildQuery(excludeIds)

  // 2nd try: no exclusion at all (allow duplicates — user owns everything of this rarity)
  if (!pool || pool.length === 0) {
    const { data: fallback } = await supabase.from('cards').select('id').eq('rarity', rarity).eq('type', 'player')
    pool = fallback
  }

  if (!pool || pool.length === 0) return null

  const randomId = pool[Math.floor(Math.random() * pool.length)].id
  const { data: card } = await supabase.from('cards').select('*').eq('id', randomId).single()
  return card as Card | null
}

export async function openPack(
  userId: string,
  packType: PackType,
  globalProgression: number  // 0-100 — les Legends sont verrouillées sous 70%
): Promise<{ cards: Card[]; error?: string }> {
  const supabase = createAdminClient()
  const config = PACK_CONFIGS[packType]

  // Load cards the user already owns to avoid duplicates
  const { data: owned } = await supabase.from('user_cards').select('card_id').eq('user_id', userId)
  const ownedIds = new Set((owned ?? []).map((r) => r.card_id as string))

  const cards: Card[] = []
  // Track IDs picked in this pack to avoid intra-pack duplicates
  const packCardIds = new Set<string>()

  for (let i = 0; i < config.cards; i++) {
    let rarity = rollRarity(config.odds as Record<string, number>)

    // Legends locked below 70% global progression
    if (rarity === 'Legend' && globalProgression < 70) rarity = 'Epic'

    const excludeIds = new Set([...ownedIds, ...packCardIds])
    const card = await pickCard(supabase, rarity, excludeIds)
    if (card) {
      cards.push(card)
      packCardIds.add(card.id)
    }
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
