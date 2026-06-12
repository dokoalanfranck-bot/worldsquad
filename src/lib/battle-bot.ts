import { createAdminClient } from '@/lib/supabase/admin'
import { computeCohesion, simulateMatch } from '@/lib/battle-engine'
import type { Card } from '@/types'

const RARITY_RANK: Record<string, number> = {
  Legend: 4, Epic: 3, Rare: 2, Common: 1,
}

type Team = { players: Card[]; coach: Card }

function statSum(card: Card): number {
  return Object.values(card.stats ?? {}).reduce<number>((s, v) => s + Number(v), 0)
}

function sortByStrength(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const rd = (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0)
    return rd !== 0 ? rd : statSum(b) - statSum(a)
  })
}

// ── Bot team selection ────────────────────────────────────────────────────────

export async function botSelectTeam(battleId: string, botId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (!battle) return

  const isChallenger = battle.challenger_id === botId
  const alreadySelected = isChallenger ? battle.challenger_team : battle.opponent_team
  if (alreadySelected) return

  // Fetch bot cards
  const { data: rows } = await admin
    .from('user_cards')
    .select('card:cards(id, name, rarity, image_url, stats, type, nation, position, flag)')
    .eq('user_id', botId)

  const allCards = (rows ?? [])
    .map((r) => r.card as unknown as Card)
    .filter(Boolean)

  if (allCards.length < 4) return

  const sorted = sortByStrength(allCards)
  const players = sorted.slice(0, 3)
  const coach = sorted[3]
  const team: Team = { players, coach }

  // Artificial thinking delay (1.2 – 2.8s)
  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1600))

  const field = isChallenger ? 'challenger_team' : 'opponent_team'
  await admin.from('battles').update({ [field]: team }).eq('id', battleId)

  // Re-fetch to see if both teams are now set
  const { data: fresh } = await admin
    .from('battles')
    .select('challenger_team, opponent_team, challenger_id, opponent_id')
    .eq('id', battleId)
    .single()

  if (!fresh) return

  const challengerTeam = (isChallenger ? team : fresh.challenger_team) as Team | null
  const opponentTeam = (!isChallenger ? team : fresh.opponent_team) as Team | null

  if (challengerTeam && opponentTeam) {
    const homeCoh = computeCohesion(challengerTeam)
    const awayCoh = computeCohesion(opponentTeam)
    const { events, homeGoals, awayGoals } = simulateMatch(
      homeCoh, awayCoh,
      challengerTeam.players, opponentTeam.players,
      battleId,
    )

    const winnerId = homeGoals > awayGoals
      ? battle.challenger_id
      : awayGoals > homeGoals
      ? battle.opponent_id
      : null

    await admin.from('battles').update({
      challenger_cohesion: homeCoh,
      opponent_cohesion: awayCoh,
      match_events: events,
      final_score: { home: homeGoals, away: awayGoals },
      winner_id: winnerId,
      match_start_at: new Date(Date.now() + 2000).toISOString(),
      phase: 'match_ready',
    }).eq('id', battleId)
  }
}

// ── Bot auto-steal (when bot wins) ────────────────────────────────────────────

export async function botAutoSteal(
  battleId: string,
  botId: string,
  humanId: string,
): Promise<string | null> {
  const admin = createAdminClient()

  // Get human's cards
  const { data: humanCards } = await admin
    .from('user_cards')
    .select('card_id, card:cards(id, name, rarity, stats)')
    .eq('user_id', humanId)

  if (!humanCards || humanCards.length === 0) return null

  // Pick the human's best card (by rarity then stats)
  const sorted = [...humanCards].sort((a, b) => {
    const ac = a.card as unknown as Card | null
    const bc = b.card as unknown as Card | null
    const rd = (RARITY_RANK[bc?.rarity ?? ''] ?? 0) - (RARITY_RANK[ac?.rarity ?? ''] ?? 0)
    return rd !== 0 ? rd : statSum(bc as Card) - statSum(ac as Card)
  })

  const target = sorted[0]
  const cardId = target.card_id

  // Steal it: remove from human's collection (bot doesn't need to add it)
  await admin.from('user_cards').delete().eq('user_id', humanId).eq('card_id', cardId)

  // Update battle: set reward_card_id + finished
  await admin.from('battles').update({
    phase: 'finished',
    status: 'finished',
    reward_card_id: cardId,
  }).eq('id', battleId)

  // Update stats: bot wins
  const [{ data: botProfile }, { data: humanProfile }] = await Promise.all([
    admin.from('users').select('battle_streak, best_streak, battles_played, battles_won').eq('id', botId).single(),
    admin.from('users').select('battles_played').eq('id', humanId).single(),
  ])

  const newStreak = (botProfile?.battle_streak ?? 0) + 1
  await Promise.all([
    admin.from('users').update({
      battle_streak: newStreak,
      best_streak: Math.max(newStreak, botProfile?.best_streak ?? 0),
      battles_played: (botProfile?.battles_played ?? 0) + 1,
      battles_won: (botProfile?.battles_won ?? 0) + 1,
    }).eq('id', botId),
    admin.from('users').update({
      battle_streak: 0,
      battles_played: (humanProfile?.battles_played ?? 0) + 1,
    }).eq('id', humanId),
  ])

  return cardId
}

// ── Check if a user is a bot ──────────────────────────────────────────────────

export async function isBot(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('is_bot').eq('id', userId).single()
  return data?.is_bot === true
}

// ── Pick a random bot from existing bots ─────────────────────────────────────

export async function pickRandomBot(): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('id')
    .eq('is_bot', true)
    .limit(20)

  if (!data || data.length === 0) return null
  return data[Math.floor(Math.random() * data.length)].id
}
