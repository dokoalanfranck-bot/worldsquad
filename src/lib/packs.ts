import { createAdminClient } from './supabase/admin'
import { PACK_CONFIGS } from '@/types'
import type { Card, CardRarity } from '@/types'

type PackType = keyof typeof PACK_CONFIGS

// Cartes des nations qui jouent aujourd'hui = 3× plus de chances
const MATCH_DAY_BOOST = 3

function rollRarity(odds: Record<string, number>): CardRarity {
  const roll = Math.random()
  let cumulative = 0
  for (const [rarity, chance] of Object.entries(odds)) {
    cumulative += chance
    if (roll < cumulative) return rarity as CardRarity
  }
  return 'Common'
}

async function getTodayNations(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Set<string>> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const { data: matches } = await supabase
    .from('matches')
    .select('team_a, team_b')
    .gte('match_date', startOfDay)
    .lt('match_date', endOfDay)

  const nations = new Set<string>()
  for (const m of matches ?? []) {
    if (m.team_a) nations.add(m.team_a)
    if (m.team_b) nations.add(m.team_b)
  }
  return nations
}

async function pickCard(
  supabase: ReturnType<typeof createAdminClient>,
  rarity: CardRarity,
  excludeIds: Set<string>,
  todayNations: Set<string>
): Promise<Card | null> {
  const buildQuery = (exclude: Set<string>) => {
    let q = supabase.from('cards').select('id, nation').eq('rarity', rarity).eq('type', 'player')
    if (exclude.size > 0) q = q.not('id', 'in', `(${Array.from(exclude).join(',')})`)
    return q
  }

  let { data: pool } = await buildQuery(excludeIds)

  // Fallback : autoriser les doublons si l'user possède tout de cette rareté
  if (!pool || pool.length === 0) {
    const { data: fallback } = await supabase
      .from('cards').select('id, nation').eq('rarity', rarity).eq('type', 'player')
    pool = fallback
  }

  if (!pool || pool.length === 0) return null

  // Sélection pondérée : les nations du jour ont MATCH_DAY_BOOST× plus de poids
  let selectedId: string
  if (todayNations.size > 0) {
    const weights = pool.map((c) => (todayNations.has(c.nation) ? MATCH_DAY_BOOST : 1))
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let roll = Math.random() * totalWeight
    selectedId = pool[pool.length - 1].id
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i]
      if (roll <= 0) { selectedId = pool[i].id; break }
    }
  } else {
    selectedId = pool[Math.floor(Math.random() * pool.length)].id
  }

  const { data: card } = await supabase.from('cards').select('*').eq('id', selectedId).single()
  return card as Card | null
}

export async function openPack(
  userId: string,
  packType: PackType,
  globalProgression: number
): Promise<{ cards: Card[]; error?: string }> {
  const supabase = createAdminClient()
  const config = PACK_CONFIGS[packType]

  // Charger en parallèle : cartes possédées + nations du jour
  const [{ data: owned }, todayNations] = await Promise.all([
    supabase.from('user_cards').select('card_id').eq('user_id', userId),
    getTodayNations(supabase),
  ])
  const ownedIds = new Set((owned ?? []).map((r) => r.card_id as string))

  const cards: Card[] = []
  const packCardIds = new Set<string>()

  for (let i = 0; i < config.cards; i++) {
    let rarity = rollRarity(config.odds as Record<string, number>)

    // Legends verrouillées sous 70% de progression globale
    if (rarity === 'Legend' && globalProgression < 70) rarity = 'Epic'

    const excludeIds = new Set([...ownedIds, ...packCardIds])
    const card = await pickCard(supabase, rarity, excludeIds, todayNations)
    if (card) {
      cards.push(card)
      packCardIds.add(card.id)
    }
  }

  if (cards.length === 0) return { cards: [], error: 'Aucune carte disponible' }

  await supabase.from('user_cards').insert(
    cards.map((card) => ({
      user_id:      userId,
      card_id:      card.id,
      obtained_via: 'pack',
    }))
  )

  return { cards }
}
