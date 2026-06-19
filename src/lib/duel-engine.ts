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

// ── Rarity weights (pay-to-win) ───────────────────────────────────────────────
const RARITY_PTS: Record<string, number> = { Legend: 14, Epic: 8, Rare: 4, Common: 1 }

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

const pos = (c: Card) => String(c.stats?.position ?? '').toUpperCase()
export const isCoach = (c: Card) => pos(c) === 'COACH'
export const isGK    = (c: Card) => pos(c) === 'GK'

// ── Position-weighted stats for a field player ────────────────────────────────
function fieldPlayerScore(c: Card): number {
  const v  = Number(c.stats?.vitesse    ?? c.stats?.pace     ?? 0)
  const t  = Number(c.stats?.technique  ?? c.stats?.passing  ?? 0)
  const pu = Number(c.stats?.puissance  ?? c.stats?.physical ?? 0)
  const sf = Number(c.stats?.sang_froid ?? c.stats?.shooting ?? 0)
  const ov = Number(c.stats?.overall    ?? 0)

  const p = pos(c)
  if (p === 'FWD') {
    // Vitesse + sang_froid (finition) + puissance comptent le plus
    return (v * 1.4 + sf * 1.3 + pu * 1.2 + t * 0.8) / 4.7
  }
  if (p === 'MID') {
    // Technique + sang_froid + équilibre
    return (t * 1.4 + sf * 1.2 + v * 0.9 + pu * 0.9) / 4.4
  }
  if (p === 'DEF') {
    // Puissance + sang_froid défensif
    return (pu * 1.5 + sf * 1.3 + t * 0.8 + v * 0.6) / 4.2
  }
  // Pas de position définie : overall direct
  return ov
}

export function computePower(picks: Card[]): number {
  const coach        = picks.find(isCoach) ?? null
  const gk           = picks.find(isGK)    ?? null
  const fieldPlayers = picks.filter((c) => !isCoach(c) && !isGK(c)).slice(0, 4)

  let score = 0

  // 1. RARITY BONUS — pay-to-win (0-45 pts, capé)
  //    Legend=14, Epic=8, Rare=4, Common=1 par carte sur les 6
  let rarityTotal = 0
  for (const c of picks) rarityTotal += RARITY_PTS[c.rarity] ?? 1
  score += Math.min(45, rarityTotal)

  // 2. STATS JOUEURS DE CHAMP pondérées par poste (0-30 pts)
  if (fieldPlayers.length > 0) {
    let statSum = 0
    for (const p of fieldPlayers) statSum += fieldPlayerScore(p)
    score += Math.round((statSum / fieldPlayers.length / 99) * 30)
  }

  // 3. COHÉSION nationale (sur les 4 joueurs de champ, 0-15 pts)
  const nations: Record<string, number> = {}
  for (const p of fieldPlayers) nations[p.nation ?? '?'] = (nations[p.nation ?? '?'] ?? 0) + 1
  const maxSame = Math.max(0, ...Object.values(nations))
  score += maxSame >= 4 ? 15 : maxSame === 3 ? 11 : maxSame === 2 ? 6 : 2

  // 4. BONUS GK (0-8 pts) — stats spécifiques gardien
  if (gk) {
    const reflexes  = Number(gk.stats?.reflexes      ?? gk.stats?.sang_froid ?? 0)
    const placement = Number(gk.stats?.positionnement ?? gk.stats?.technique  ?? 0)
    score += Math.round(((reflexes + placement) / 2 / 99) * 8)
  }

  // 5. BONUS COACH (0-7 pts) — stats spécifiques coach
  if (coach) {
    const tactique   = Number(coach.stats?.tactique   ?? 0)
    const motivation = Number(coach.stats?.motivation ?? 0)
    score += Math.round(((tactique + motivation) / 2 / 99) * 7)
  }

  // 6. SYNERGIE coach-nation (0-5 pts)
  if (coach?.nation && nations[coach.nation]) {
    score += nations[coach.nation] >= 2 ? 5 : 2
  }

  return Math.min(100, Math.round(score))
}

function pickEventCard(
  picks: Card[],
  type: 'goal' | 'chance' | 'save',
  rand: () => number,
): Card {
  if (type === 'save') {
    return picks.find(isGK) ?? picks.find((c) => !isCoach(c)) ?? picks[0]
  }
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
