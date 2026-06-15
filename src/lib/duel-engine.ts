import type { Card } from '@/types'

export interface DuelEvent {
  minute: number
  timeMs: number
  team: 'challenger' | 'opponent'
  playerName: string
  cardImageUrl: string | null
  cardRarity: string
  type: 'goal' | 'chance' | 'save'
}

const RARITY_PTS: Record<string, number> = { Legend: 10, Epic: 7, Rare: 4, Common: 1 }
const STAT_KEYS = ['pace', 'shooting', 'passing', 'defending', 'dribbling', 'physical']

function seededRng(seed: string) {
  let s = seed.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return Math.abs(s) / 0x7fffffff
  }
}

// Exported so add-bot can shuffle the pool deterministically per duelId
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rand = seededRng(seed)
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const isCoach = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'COACH'
const isGK    = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'GK'

export function computePower(picks: Card[]): number {
  if (!picks.length) return 0

  const coach       = picks.find(isCoach) ?? null
  const gk          = picks.find(isGK) ?? null
  const fieldPlayers = picks.filter((c) => !isCoach(c) && !isGK(c)).slice(0, 4)

  let score = 0

  // Nation cohesion on field players (0-35)
  const nations: Record<string, number> = {}
  for (const p of fieldPlayers) nations[p.nation ?? '?'] = (nations[p.nation ?? '?'] ?? 0) + 1
  const maxSame = Math.max(0, ...Object.values(nations))
  score += maxSame >= 4 ? 35 : maxSame === 3 ? 25 : maxSame === 2 ? 15 : 5

  // Coach synergy (0-8)
  if (coach?.nation && nations[coach.nation]) score += nations[coach.nation] >= 2 ? 8 : 4

  // GK bonus (0-10): defending + physical stats
  if (gk) {
    const def = Number(gk.stats?.defending ?? 0)
    const phy = Number(gk.stats?.physical ?? 0)
    score += Math.round(((def + phy) / 2 / 99) * 10)
  }

  // Rarity bonus on all 6 cards (0-30)
  let rarityTotal = 0
  for (const c of picks) rarityTotal += RARITY_PTS[c.rarity] ?? 1
  score += Math.min(30, rarityTotal)

  // Stats average on field players (0-35)
  let statSum = 0, statCount = 0
  for (const p of fieldPlayers) {
    for (const k of STAT_KEYS) {
      const v = Number(p.stats?.[k] ?? 0)
      if (v > 0) { statSum += v; statCount++ }
    }
  }
  if (statCount > 0) score += Math.round((statSum / statCount / 99) * 35)

  return Math.min(100, Math.round(score))
}

function pickEventCard(
  picks: Card[],
  type: 'goal' | 'chance' | 'save',
  rand: () => number,
): Card {
  if (type === 'save') {
    // GK makes saves; fallback to first non-coach
    return picks.find(isGK) ?? picks.find((c) => !isCoach(c)) ?? picks[0]
  }
  // Goals and chances: field players only (not GK, not coach)
  const field = picks.filter((c) => !isGK(c) && !isCoach(c))
  const pool  = field.length > 0 ? field : picks.filter((c) => !isCoach(c))
  return pool[Math.floor(rand() * pool.length)] ?? picks[0]
}

export function simulateDuel(
  challengerPicks: Card[],
  opponentPicks: Card[],
  duelId: string,
): { events: DuelEvent[]; challengerScore: number; opponentScore: number } {
  const rand = seededRng(duelId)
  const cp   = computePower(challengerPicks)
  const op   = computePower(opponentPicks)
  const total = cp + op || 100
  const cProb = cp / total

  const avg       = (cp + op) / 2
  const goalCount = 2 + Math.floor(rand() * (avg > 70 ? 4 : avg > 50 ? 3 : 2))
  const chanceMult = avg > 60 ? 2 : 1

  const usedMinutes = new Set<number>()
  const allMinutes: number[] = []

  for (let i = 0; i < goalCount; i++) {
    let m: number
    do { m = 1 + Math.floor(rand() * 89) } while (usedMinutes.has(m))
    usedMinutes.add(m)
    allMinutes.push(m)
  }

  for (let i = 0; i < chanceMult * 2; i++) {
    let m: number
    do { m = 1 + Math.floor(rand() * 89) } while (usedMinutes.has(m))
    usedMinutes.add(m)
    allMinutes.push(m)
  }

  allMinutes.sort((a, b) => a - b)

  const MATCH_DURATION_MS = 30000
  const events: DuelEvent[] = []

  for (const minute of allMinutes) {
    const goalsLeft = goalCount - events.filter((e) => e.type === 'goal').length
    const isGoal    = goalsLeft > 0 && rand() < 0.65
    const type: DuelEvent['type'] = isGoal ? 'goal' : rand() < 0.5 ? 'chance' : 'save'

    // For saves the defending team acts; for goals/chances the attacking team
    const attackTeam: 'challenger' | 'opponent' = rand() < cProb ? 'challenger' : 'opponent'
    const team: 'challenger' | 'opponent'       = type === 'save'
      ? (attackTeam === 'challenger' ? 'opponent' : 'challenger')
      : attackTeam

    const teamPicks = team === 'challenger' ? challengerPicks : opponentPicks
    const card = pickEventCard(teamPicks, type, rand)

    events.push({
      minute,
      timeMs:       Math.round((minute / 90) * MATCH_DURATION_MS),
      team,
      playerName:   card?.name ?? 'Joueur',
      cardImageUrl: card?.image_url ?? null,
      cardRarity:   card?.rarity   ?? 'Common',
      type,
    })
  }

  const goals = events.filter((e) => e.type === 'goal')
  const challengerScore = goals.filter((e) => e.team === 'challenger').length
  const opponentScore   = goals.filter((e) => e.team === 'opponent').length

  return { events, challengerScore, opponentScore }
}

const BOT_NAMES = [
  'Karim_77', 'DiazXI', 'LeBlanc11', 'Torres_FC', 'Rafinha_CF',
  'Rodrigo10', 'KDB_Eight', 'VinJr_7', 'Pedri6', 'Bellingham8',
  'Haaland_9', 'KaneCF', 'SalahEG', 'LukaM_10', 'GriezAntoine',
  'BenzKB9', 'DeLight_CB', 'Theo_OG', 'Lemar_MG', 'ChoupoMG',
]

const BOT_NATIONS = [
  'France', 'Brazil', 'Argentina', 'Spain', 'Germany',
  'Portugal', 'Morocco', 'USA', 'Japan', 'Senegal',
  'Croatia', 'Belgium', 'Netherlands', 'Mexico', 'England',
]

export function randomBotName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
}

export function botNation(name: string): string {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return BOT_NATIONS[hash % BOT_NATIONS.length]
}
