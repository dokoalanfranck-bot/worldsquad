import { simulateDuel, seededShuffle } from './duel-engine'
import type { Card } from '@/types'

const isCoach = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'COACH'
const isGK    = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'GK'
const RARITY_ORDER: Record<string, number> = { Legend: 4, Epic: 3, Rare: 2, Common: 1 }

export function selectBestSix(cards: Card[]): Card[] {
  const sorted = [...cards].sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))
  const coach  = sorted.find(isCoach)
  const gk     = sorted.find(isGK)
  const field  = sorted.filter((c) => !isCoach(c) && !isGK(c))
  const picks: Card[] = []
  if (gk) picks.push(gk)
  if (coach) picks.push(coach)
  picks.push(...field.slice(0, 6 - picks.length))
  const used = new Set(picks.map((p) => p.id))
  picks.push(...sorted.filter((c) => !used.has(c.id)).slice(0, 6 - picks.length))
  return picks.slice(0, 6)
}

export function getBotPicksFromPool(pool: Card[], seed: string): Card[] {
  const shuffled = seededShuffle(pool, seed)
  const coach    = shuffled.find(isCoach)
  const gk       = shuffled.find(isGK)
  const field    = shuffled.filter((c) => !isCoach(c) && !isGK(c))
  const picks: Card[] = []
  if (gk) picks.push(gk)
  if (coach) picks.push(coach)
  picks.push(...field.slice(0, 6 - picks.length))
  return picks.slice(0, 6)
}

export interface TournamentSimResult {
  semi1:        { scoreA: number; scoreB: number; events: unknown[]; winner: number }
  semi2:        { scoreA: number; scoreB: number; events: unknown[]; winner: number }
  final:        { scoreA: number; scoreB: number; events: unknown[]; winner: number }
  winner_slot:  number
  finalist_slot: number
}

export function simulateTournament(
  picks: [Card[], Card[], Card[], Card[]],
  seed: string,
): TournamentSimResult {
  const s1 = simulateDuel(picks[0], picks[1], seed + '_semi1')
  const semi1Winner = s1.challengerScore >= s1.opponentScore ? 0 : 1

  const s2 = simulateDuel(picks[2], picks[3], seed + '_semi2')
  const semi2Winner = s2.challengerScore >= s2.opponentScore ? 2 : 3

  const sf = simulateDuel(picks[semi1Winner], picks[semi2Winner], seed + '_final')
  const winnerSlot   = sf.challengerScore >= sf.opponentScore ? semi1Winner : semi2Winner
  const finalistSlot = sf.challengerScore >= sf.opponentScore ? semi2Winner : semi1Winner

  return {
    semi1:         { scoreA: s1.challengerScore, scoreB: s1.opponentScore, events: s1.events, winner: semi1Winner },
    semi2:         { scoreA: s2.challengerScore, scoreB: s2.opponentScore, events: s2.events, winner: semi2Winner },
    final:         { scoreA: sf.challengerScore, scoreB: sf.opponentScore, events: sf.events, winner: winnerSlot },
    winner_slot:   winnerSlot,
    finalist_slot: finalistSlot,
  }
}
