import type { Card } from '@/types'

export interface MatchEvent {
  minute: number
  timeMs: number
  team: 'home' | 'away'
  playerName: string
}

export interface TeamSetup {
  players: Card[]
  coach: Card
}

const RARITY_PTS: Record<string, number> = { Legend: 7, Epic: 5, Rare: 3, Common: 1 }
const STAT_KEYS = ['pace', 'shooting', 'passing', 'defending', 'dribbling', 'physical']

export function computeCohesion(team: TeamSetup): number {
  const { players, coach } = team
  let score = 0

  // 1. Nation cohesion (0-35) — plus de joueurs de la même nation = plus de cohésion
  const nationCount: Record<string, number> = {}
  for (const p of players) {
    const n = p.nation ?? 'unknown'
    nationCount[n] = (nationCount[n] ?? 0) + 1
  }
  const maxSame = Math.max(0, ...Object.values(nationCount))
  score += maxSame === 3 ? 35 : maxSame === 2 ? 20 : 5

  // 2. Coach synergy (0-8) — coach partage la nationalité des joueurs
  const coachNation = coach.nation ?? ''
  if (coachNation && nationCount[coachNation]) {
    score += nationCount[coachNation] >= 2 ? 8 : 4
  }

  // 3. Rarity bonus (0-22) — cartes rares = équipe plus puissante
  let rarityTotal = 0
  for (const c of [...players, coach]) rarityTotal += RARITY_PTS[c.rarity] ?? 1
  score += Math.min(22, rarityTotal)

  // 4. Stats average (0-35) — moyenne des stats des 3 joueurs
  let statSum = 0, statCount = 0
  for (const p of players) {
    for (const k of STAT_KEYS) {
      const v = Number(p.stats?.[k] ?? 0)
      if (v > 0) { statSum += v; statCount++ }
    }
  }
  if (statCount > 0) score += Math.round((statSum / statCount / 95) * 35)

  return Math.min(100, Math.round(score))
}

// LCG seeded random — résultat déterministe basé sur l'ID de la battle
function makeRng(seed: string) {
  let s = seed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 42)
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return Math.abs(s) / 0x7fffffff
  }
}

export function simulateMatch(
  homeCohesion: number,
  awayCohesion: number,
  homePlayers: Card[],
  awayPlayers: Card[],
  battleId: string,
): { events: MatchEvent[]; homeGoals: number; awayGoals: number } {
  const rand = makeRng(battleId)
  const total = homeCohesion + awayCohesion || 100
  const homeProb = homeCohesion / total

  // Nombre de buts (2-5 selon cohésion combinée)
  const avg = (homeCohesion + awayCohesion) / 2
  const maxGoals = avg > 75 ? 5 : avg > 55 ? 4 : 3
  const goalCount = 2 + Math.floor(rand() * (maxGoals - 1))

  const usedMinutes = new Set<number>()
  const events: MatchEvent[] = []

  for (let i = 0; i < goalCount; i++) {
    let minute: number
    do { minute = 1 + Math.floor(rand() * 89) } while (usedMinutes.has(minute))
    usedMinutes.add(minute)

    const team: 'home' | 'away' = rand() < homeProb ? 'home' : 'away'
    const scorers = team === 'home' ? homePlayers : awayPlayers
    const scorer = scorers[Math.floor(rand() * scorers.length)]

    events.push({
      minute,
      timeMs: Math.round((minute / 90) * 19000),
      team,
      playerName: scorer?.name ?? 'Joueur',
    })
  }

  events.sort((a, b) => a.minute - b.minute)

  return {
    events,
    homeGoals: events.filter((e) => e.team === 'home').length,
    awayGoals: events.filter((e) => e.team === 'away').length,
  }
}
