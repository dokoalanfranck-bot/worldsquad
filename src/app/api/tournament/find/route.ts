import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { simulateDuel, seededShuffle, randomBotName, botNation } from '@/lib/duel-engine'
import type { Card } from '@/types'

export const dynamic = 'force-dynamic'

const isCoach = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'COACH'
const isGK    = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'GK'

const RARITY_ORDER: Record<string, number> = { Legend: 4, Epic: 3, Rare: 2, Common: 1 }

function selectBestSix(cards: Card[]): Card[] {
  const sorted = [...cards].sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))
  const coach = sorted.find(isCoach)
  const gk    = sorted.find(isGK)
  const field = sorted.filter((c) => !isCoach(c) && !isGK(c))
  const picks: Card[] = []
  if (gk) picks.push(gk)
  if (coach) picks.push(coach)
  picks.push(...field.slice(0, 6 - picks.length))
  const used = new Set(picks.map((p) => p.id))
  const rest = sorted.filter((c) => !used.has(c.id))
  picks.push(...rest.slice(0, 6 - picks.length))
  return picks.slice(0, 6)
}

async function getBotPicks(admin: ReturnType<typeof createAdminClient>, seed: string, pool: Card[]): Promise<Card[]> {
  const shuffled = seededShuffle(pool, seed)
  const coach = shuffled.find(isCoach)
  const gk    = shuffled.find(isGK)
  const field = shuffled.filter((c) => !isCoach(c) && !isGK(c))
  const picks: Card[] = []
  if (gk) picks.push(gk)
  if (coach) picks.push(coach)
  picks.push(...field.slice(0, 6 - picks.length))
  return picks.slice(0, 6)
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: profile }, { data: cardPool }] = await Promise.all([
    admin.from('users').select('pseudo, nation').eq('id', user.id).single(),
    admin.from('cards').select('id, name, rarity, image_url, stats, type, nation, description, created_at').eq('type', 'player').limit(200),
  ])

  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const pool = (cardPool ?? []) as Card[]
  const seed = crypto.randomUUID()

  // Picks for user
  let userPicks: Card[] = []
  const { data: userCardRefs } = await admin.from('user_cards').select('card_id').eq('user_id', user.id)
  if (userCardRefs?.length) {
    const ids = userCardRefs.map((r) => r.card_id)
    const { data: owned } = await admin
      .from('cards').select('id, name, rarity, image_url, stats, type, nation, description, created_at')
      .eq('type', 'player').in('id', ids)
    if ((owned?.length ?? 0) >= 3) userPicks = selectBestSix(owned as Card[])
  }
  if (userPicks.length < 3) userPicks = await getBotPicks(admin, seed + '_p0', pool)

  // Bots info
  const bots = [
    { pseudo: randomBotName(), nation: botNation(seed + '1') },
    { pseudo: randomBotName(), nation: botNation(seed + '2') },
    { pseudo: randomBotName(), nation: botNation(seed + '3') },
  ]

  // Picks for bots
  const [picks1, picks2, picks3] = await Promise.all([
    getBotPicks(admin, seed + '_p1', pool),
    getBotPicks(admin, seed + '_p2', pool),
    getBotPicks(admin, seed + '_p3', pool),
  ])

  // Semi 1: p0 vs p1
  const s1 = simulateDuel(userPicks, picks1, seed + '_semi1')
  const semi1Winner = s1.challengerScore >= s1.opponentScore ? 0 : 1

  // Semi 2: p2 vs p3
  const s2 = simulateDuel(picks2, picks3, seed + '_semi2')
  const semi2Winner = s2.challengerScore >= s2.opponentScore ? 2 : 3

  // Final
  const finalPicksA = semi1Winner === 0 ? userPicks : picks1
  const finalPicksB = semi2Winner === 2 ? picks2 : picks3
  const sf = simulateDuel(finalPicksA, finalPicksB, seed + '_final')
  const finalWinnerSlot = sf.challengerScore >= sf.opponentScore ? semi1Winner : semi2Winner

  const isUserWinner   = finalWinnerSlot === 0
  const isUserFinalist = semi1Winner === 0 && finalWinnerSlot !== 0
  const coinsWon       = isUserWinner ? 300 : isUserFinalist ? 100 : 0

  const { data: tournament, error } = await admin.from('tournaments').insert({
    p0_id:     user.id,
    p0_pseudo: profile.pseudo,
    p0_nation: profile.nation,
    p1_pseudo: bots[0].pseudo,
    p1_nation: bots[0].nation,
    p2_pseudo: bots[1].pseudo,
    p2_nation: bots[1].nation,
    p3_pseudo: bots[2].pseudo,
    p3_nation: bots[2].nation,
    semi1:     { scoreA: s1.challengerScore, scoreB: s1.opponentScore, events: s1.events, winner: semi1Winner },
    semi2:     { scoreA: s2.challengerScore, scoreB: s2.opponentScore, events: s2.events, winner: semi2Winner },
    final:     { scoreA: sf.challengerScore, scoreB: sf.opponentScore, events: sf.events, winner: finalWinnerSlot },
    winner_slot: finalWinnerSlot,
    winner_id:   isUserWinner ? user.id : null,
    coins_won:   coinsWon,
    status:      'finished',
  }).select('id').single()

  if (error || !tournament) {
    console.error('[tournament/find]', error)
    return NextResponse.json({ error: 'Erreur création tournoi' }, { status: 500 })
  }

  if (coinsWon > 0) {
    await Promise.allSettled([
      admin.rpc('increment_coins', { user_id: user.id, delta: coinsWon }),
      admin.from('coin_transactions').insert({
        user_id: user.id,
        amount:  coinsWon,
        reason:  `Tournoi ${isUserWinner ? '🏆 1ère place' : '🥈 2ème place'} — ${tournament.id.slice(0, 8)}`,
      }),
    ])
  }

  return NextResponse.json({ tournamentId: tournament.id })
}
