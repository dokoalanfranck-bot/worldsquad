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

  const body = await req.json() as { shooterCardIds: string[]; gkCardId: string }
  const { shooterCardIds, gkCardId } = body

  if (!Array.isArray(shooterCardIds) || shooterCardIds.length !== 3 || !gkCardId) {
    return NextResponse.json({ error: '3 tireurs et 1 gardien requis' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('penalty_battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.status !== 'picking') return NextResponse.json({ error: 'Phase de sélection terminée' }, { status: 400 })
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isChallenger = user.id === battle.challenger_id
  if ((isChallenger && battle.challenger_picks) || (!isChallenger && battle.opponent_picks)) {
    return NextResponse.json({ alreadySubmitted: true })
  }

  const allCardIds = [...shooterCardIds, gkCardId]
  if (new Set(allCardIds).size !== 4) {
    return NextResponse.json({ error: 'Les 4 cartes doivent être différentes' }, { status: 400 })
  }

  // Verify ownership
  const { data: owned } = await admin
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user.id)
    .in('card_id', allCardIds)

  const ownedIds = new Set((owned ?? []).map((uc) => uc.card_id as string))
  for (const cid of allCardIds) {
    if (!ownedIds.has(cid)) {
      return NextResponse.json({ error: 'Carte non possédée' }, { status: 400 })
    }
  }

  // Fetch card definitions
  const { data: cardDefs } = await admin
    .from('cards')
    .select('id, name, rarity, image_url, stats, type, nation')
    .in('id', allCardIds)

  const defMap = new Map((cardDefs ?? []).map((c) => [c.id, c]))

  // Build ordered picks: [shooter0, shooter1, shooter2, gk]
  const picks = [
    ...shooterCardIds.map((id) => defMap.get(id)),
    defMap.get(gkCardId),
  ].filter(Boolean)

  if (picks.length !== 4) {
    return NextResponse.json({ error: 'Cartes introuvables' }, { status: 400 })
  }

  const picksField = isChallenger ? 'challenger_picks' : 'opponent_picks'
  await admin.from('penalty_battles').update({
    [picksField]: picks,
    updated_at: new Date().toISOString(),
  }).eq('id', battleId)

  // If both submitted → start game
  const { data: fresh } = await admin
    .from('penalty_battles')
    .select('challenger_picks, opponent_picks')
    .eq('id', battleId)
    .single()

  if (fresh?.challenger_picks && fresh?.opponent_picks) {
    await admin.from('penalty_battles').update({
      status: 'active',
      round_deadline: new Date(Date.now() + 15000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', battleId).eq('status', 'picking')
  }

  return NextResponse.json({ ok: true })
}
