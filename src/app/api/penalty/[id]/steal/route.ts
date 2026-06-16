import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { cardIds } = await req.json() as { cardIds: string[] }
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: 'Aucune carte sélectionnée' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('penalty_battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.status !== 'stealing') return NextResponse.json({ error: 'Phase de vol non active' }, { status: 400 })
  if (battle.winner_id !== user.id) return NextResponse.json({ error: 'Réservé au gagnant' }, { status: 403 })

  const stakeCount: number = battle.stake_count ?? 1
  if (cardIds.length !== stakeCount) {
    return NextResponse.json({ error: `Sélectionne exactement ${stakeCount} carte(s)` }, { status: 400 })
  }

  const loserId: string = battle.winner_id === battle.challenger_id ? battle.opponent_id : battle.challenger_id
  if (!loserId) return NextResponse.json({ error: 'Adversaire introuvable' }, { status: 400 })

  const loserPicks = (battle.winner_id === battle.challenger_id
    ? battle.opponent_picks
    : battle.challenger_picks) as Array<{ id: string }> | null

  const loserPickIds = new Set((loserPicks ?? []).map((c) => c.id))
  for (const cid of cardIds) {
    if (!loserPickIds.has(cid)) {
      return NextResponse.json({ error: 'Carte invalide' }, { status: 400 })
    }
  }

  // Transfer each chosen card from loser to winner
  for (const cardId of cardIds) {
    const { data: uc } = await admin
      .from('user_cards')
      .select('id')
      .eq('user_id', loserId)
      .eq('card_id', cardId)
      .limit(1)
      .maybeSingle()

    if (uc) {
      await admin.from('user_cards').delete().eq('id', uc.id)
      await admin.from('user_cards').insert({
        user_id: user.id,
        card_id: cardId,
        obtained_via: 'penalty_battle',
      })
    }
  }

  // Finalize battle
  await admin.from('penalty_battles').update({
    status: 'finished',
    stolen_card_ids: cardIds,
    updated_at: new Date().toISOString(),
  }).eq('id', battleId)

  // Update stats
  const [{ data: winP }, { data: losP }] = await Promise.all([
    admin.from('users').select('battles_won, battles_played').eq('id', user.id).single(),
    admin.from('users').select('battles_played').eq('id', loserId).single(),
  ])
  await Promise.all([
    admin.from('users').update({
      battles_won: (winP?.battles_won ?? 0) + 1,
      battles_played: (winP?.battles_played ?? 0) + 1,
    }).eq('id', user.id),
    admin.from('users').update({
      battles_played: (losP?.battles_played ?? 0) + 1,
    }).eq('id', loserId),
  ])

  return NextResponse.json({ ok: true })
}
