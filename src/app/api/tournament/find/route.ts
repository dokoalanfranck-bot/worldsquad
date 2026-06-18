import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBotName, botNation, seededShuffle } from '@/lib/duel-engine'
import { simulateTournament, getBotPicksFromPool } from '@/lib/tournament-engine'
import type { Card } from '@/types'

export const dynamic = 'force-dynamic'

const JOIN_WINDOW_SECONDS = 60

async function buildBotPicks(
  admin: ReturnType<typeof createAdminClient>,
  seed: string,
): Promise<Card[]> {
  const { data } = await admin
    .from('cards')
    .select('id, name, rarity, image_url, stats, type, nation, description, created_at')
    .eq('type', 'player')
    .limit(200)
  const pool = seededShuffle((data ?? []) as Card[], seed)
  return getBotPicksFromPool(pool, seed)
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users')
    .select('pseudo, nation, is_admin')
    .eq('id', user.id)
    .single()
  if (!profile)     return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  if (profile.is_admin) return NextResponse.json({ error: 'Les comptes admin ne peuvent pas participer' }, { status: 403 })

  // Empêcher de rejoindre si déjà dans un tournoi en attente
  const { data: alreadyIn } = await admin
    .from('tournaments')
    .select('id')
    .eq('status', 'waiting')
    .or(`p0_id.eq.${user.id},p1_id.eq.${user.id},p2_id.eq.${user.id},p3_id.eq.${user.id}`)
    .maybeSingle()
  if (alreadyIn) return NextResponse.json({ tournamentId: alreadyIn.id })

  // Chercher un tournoi en attente avec une place libre
  const now = new Date().toISOString()
  const { data: openList } = await admin
    .from('tournaments')
    .select('id, p0_id, p0_pseudo, p0_nation, p1_id, p1_pseudo, p1_nation, p2_id, p2_pseudo, p2_nation, p3_id, p3_pseudo, p3_nation')
    .eq('status', 'waiting')
    .gt('join_deadline', now)
    .limit(5)

  for (const t of openList ?? []) {
    for (const slot of [1, 2, 3] as const) {
      const idKey     = `p${slot}_id`     as keyof typeof t
      const pseudoKey = `p${slot}_pseudo` as keyof typeof t
      const nationKey = `p${slot}_nation` as keyof typeof t
      if (t[idKey] !== null) continue

      // Claim atomique : échoue si un autre joueur a pris le slot
      const { data: claimed } = await admin
        .from('tournaments')
        .update({ [idKey]: user.id, [pseudoKey]: profile.pseudo, [nationKey]: profile.nation })
        .eq('id', t.id)
        .is(idKey, null)
        .eq('status', 'waiting')
        .select('id, p0_id, p0_pseudo, p0_nation, p1_id, p1_pseudo, p1_nation, p2_id, p2_pseudo, p2_nation, p3_id, p3_pseudo, p3_nation')
        .maybeSingle()

      if (!claimed) continue

      // Vérifier si les 4 slots sont remplis → lancer les demi-finales
      if (claimed.p0_id && claimed.p1_id && claimed.p2_id && claimed.p3_id) {
        await launchSemis(admin, claimed)
      }
      return NextResponse.json({ tournamentId: t.id })
    }
  }

  // Créer un nouveau tournoi
  const deadline = new Date(Date.now() + JOIN_WINDOW_SECONDS * 1000).toISOString()
  const { data: newT, error } = await admin.from('tournaments').insert({
    p0_id:         user.id,
    p0_pseudo:     profile.pseudo,
    p0_nation:     profile.nation,
    status:        'waiting',
    join_deadline: deadline,
    coins_won:     0,
  }).select('id').single()

  if (error || !newT) return NextResponse.json({ error: 'Erreur création tournoi' }, { status: 500 })
  return NextResponse.json({ tournamentId: newT.id })
}

// ── Launch semi-final duels ────────────────────────────────────────────────────
export async function launchSemis(
  admin: ReturnType<typeof createAdminClient>,
  t: {
    id: string
    p0_id: string; p0_pseudo: string; p0_nation: string
    p1_id: string | null; p1_pseudo: string; p1_nation: string
    p2_id: string | null; p2_pseudo: string; p2_nation: string
    p3_id: string | null; p3_pseudo: string; p3_nation: string
  },
) {
  const seed = t.id

  // ── Semi1: p0 vs p1 ────────────────────────────────────────────────────────
  let semi1DuelId: string | null = null

  if (t.p1_id) {
    // Vrai joueur vs vrai joueur
    const { data: d } = await admin.from('duels').insert({
      challenger_id:    t.p0_id,
      opponent_id:      t.p1_id,
      is_bot:           false,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    t.id,
      tournament_round: 'semi1',
    }).select('id').single()
    semi1DuelId = d?.id ?? null
  } else {
    // Joueur vs bot
    const { data: d } = await admin.from('duels').insert({
      challenger_id:    t.p0_id,
      is_bot:           true,
      bot_name:         t.p1_pseudo,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    t.id,
      tournament_round: 'semi1',
    }).select('id').single()
    if (d) {
      const botPicks = await buildBotPicks(admin, seed + '_p1')
      await admin.from('duels').update({ opponent_picks: botPicks, status: 'picking', picks_deadline: new Date(Date.now() + 45000).toISOString() }).eq('id', d.id)
      semi1DuelId = d.id
    }
  }

  // ── Semi2: p2 vs p3 ────────────────────────────────────────────────────────
  let semi2DuelId: string | null = null
  let semi2Result: Record<string, unknown> | null = null

  if (!t.p2_id && !t.p3_id) {
    // Bot vs Bot — simuler immédiatement, pas de duel créé
    const { data: cardPool } = await admin.from('cards').select('id, name, rarity, image_url, stats, type, nation, description, created_at').eq('type', 'player').limit(200)
    const pool = (cardPool ?? []) as Card[]
    const p2picks = getBotPicksFromPool(pool, seed + '_p2')
    const p3picks = getBotPicksFromPool(pool, seed + '_p3')
    const sim = simulateTournament([p2picks, p3picks, p2picks, p3picks], seed + '_semi2only')
    const semi2Winner = sim.semi1.winner // reuse semi1 from sub-simulation (p2 vs p3)
    semi2Result = { scoreA: sim.semi1.scoreA, scoreB: sim.semi1.scoreB, events: sim.semi1.events, winner: semi2Winner + 2 }
  } else if (t.p2_id && !t.p3_id) {
    // Joueur vs bot
    const { data: d } = await admin.from('duels').insert({
      challenger_id:    t.p2_id,
      is_bot:           true,
      bot_name:         t.p3_pseudo,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    t.id,
      tournament_round: 'semi2',
    }).select('id').single()
    if (d) {
      const botPicks = await buildBotPicks(admin, seed + '_p3')
      await admin.from('duels').update({ opponent_picks: botPicks, status: 'picking', picks_deadline: new Date(Date.now() + 45000).toISOString() }).eq('id', d.id)
      semi2DuelId = d.id
    }
  } else if (t.p2_id && t.p3_id) {
    // Vrai joueur vs vrai joueur
    const { data: d } = await admin.from('duels').insert({
      challenger_id:    t.p2_id,
      opponent_id:      t.p3_id,
      is_bot:           false,
      status:           'open',
      stake_count:      1,
      coins_stake:      0,
      tournament_id:    t.id,
      tournament_round: 'semi2',
    }).select('id').single()
    semi2DuelId = d?.id ?? null
  }

  // Mise à jour du tournoi
  await admin.from('tournaments').update({
    status:        'semi_active',
    semi1_duel_id: semi1DuelId,
    semi2_duel_id: semi2DuelId,
    ...(semi2Result ? { semi2: semi2Result } : {}),
  }).eq('id', t.id)
}
