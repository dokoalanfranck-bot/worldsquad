import type { Card } from '@/types'

export interface DuelEvent {
  minute: number
  timeMs: number       // ms offset for client animation
  team: 'challenger' | 'opponent'
  playerName: string
  type: 'goal' | 'chance' | 'save'
}

const RARITY_PTS: Record<string, number> = { Legend: 10, Epic: 7, Rare: 4, Common: 1 }
const STAT_KEYS = ['pace', 'shooting', 'passing', 'defending', 'dribbling', 'physical']

// Seeded LCG — deterministic per duel id
function seededRng(seed: string) {
  let s = seed.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return Math.abs(s) / 0x7fffffff
  }
}

export function computePower(picks: Card[]): number {
  if (!picks.length) return 0
  const isCoach = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'COACH'
  const players = picks.filter((c) => !isCoach(c)).slice(0, 3)
  const coach = picks.find(isCoach) ?? picks[picks.length - 1]

  let score = 0

  // Nation cohesion (0–35)
  const nations: Record<string, number> = {}
  for (const p of players) nations[p.nation ?? '?'] = (nations[p.nation ?? '?'] ?? 0) + 1
  const maxSame = Math.max(0, ...Object.values(nations))
  score += maxSame === 3 ? 35 : maxSame === 2 ? 20 : 5

  // Coach synergy (0–8)
  if (coach.nation && nations[coach.nation]) score += nations[coach.nation] >= 2 ? 8 : 4

  // Rarity bonus (0–22)
  let rarityTotal = 0
  for (const c of [...players, coach]) rarityTotal += RARITY_PTS[c.rarity] ?? 1
  score += Math.min(22, rarityTotal)

  // Stats average (0–35)
  let statSum = 0, statCount = 0
  for (const p of players) {
    for (const k of STAT_KEYS) {
      const v = Number(p.stats?.[k] ?? 0)
      if (v > 0) { statSum += v; statCount++ }
    }
  }
  if (statCount > 0) score += Math.round((statSum / statCount / 99) * 35)

  return Math.min(100, Math.round(score))
}

export function simulateDuel(
  challengerPicks: Card[],
  opponentPicks: Card[],
  duelId: string,
): { events: DuelEvent[]; challengerScore: number; opponentScore: number } {
  const rand = seededRng(duelId)
  const cp = computePower(challengerPicks)
  const op = computePower(opponentPicks)
  const total = cp + op || 100
  const cProb = cp / total

  const avg = (cp + op) / 2
  const goalCount = 2 + Math.floor(rand() * (avg > 70 ? 4 : avg > 50 ? 3 : 2))
  const chanceMult = avg > 60 ? 2 : 1

  const usedMinutes = new Set<number>()
  const allMinutes: number[] = []

  // Goals
  for (let i = 0; i < goalCount; i++) {
    let m: number
    do { m = 1 + Math.floor(rand() * 89) } while (usedMinutes.has(m))
    usedMinutes.add(m)
    allMinutes.push(m)
  }

  // Chance/Save events (cosmetic)
  for (let i = 0; i < chanceMult * 2; i++) {
    let m: number
    do { m = 1 + Math.floor(rand() * 89) } while (usedMinutes.has(m))
    usedMinutes.add(m)
    allMinutes.push(m)
  }

  allMinutes.sort((a, b) => a - b)

  const MATCH_DURATION_MS = 22000
  const events: DuelEvent[] = []

  for (const minute of allMinutes) {
    const team: 'challenger' | 'opponent' = rand() < cProb ? 'challenger' : 'opponent'
    const scorers = team === 'challenger' ? challengerPicks : opponentPicks
    const scorer = scorers[Math.floor(rand() * scorers.length)]
    const isGoal = goalCount > 0 && events.filter((e) => e.type === 'goal').length < goalCount
      && rand() < 0.65
    const type: DuelEvent['type'] = isGoal ? 'goal' : rand() < 0.5 ? 'chance' : 'save'

    events.push({
      minute,
      timeMs: Math.round((minute / 90) * MATCH_DURATION_MS),
      team,
      playerName: scorer?.name ?? 'Joueur',
      type,
    })
  }

  const goals = events.filter((e) => e.type === 'goal')
  const challengerScore = goals.filter((e) => e.team === 'challenger').length
  const opponentScore = goals.filter((e) => e.team === 'opponent').length

  return { events, challengerScore, opponentScore }
}

export function pickRewardCard(loserPicks: Card[], winnerPicks: Card[]): Card | null {
  const winnerIds = new Set(winnerPicks.map((c) => c.id))
  const stealable = loserPicks.filter((c) => !winnerIds.has(c.id))
  if (!stealable.length) return loserPicks[0] ?? null // fallback: any card
  // Pick highest rarity, then highest stat sum
  return stealable.sort((a, b) => {
    const rd = (RARITY_PTS[b.rarity] ?? 0) - (RARITY_PTS[a.rarity] ?? 0)
    if (rd !== 0) return rd
    const sa = Object.values(a.stats ?? {}).reduce<number>((s, v) => s + Number(v), 0)
    const sb = Object.values(b.stats ?? {}).reduce<number>((s, v) => s + Number(v), 0)
    return sb - sa
  })[0]
}

const BOT_NAMES = [
  'AlphaBotFC', 'TitanXI', 'OmegaSC', 'NovaCF', 'ApexFF',
  'ZetaUnited', 'PhoenixFC', 'VortexSC', 'NexusXI', 'CypherCF',
]

export function randomBotName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
}
