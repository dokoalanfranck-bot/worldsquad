import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { cardId } = await req.json() as { cardId: string }
  if (!cardId) return NextResponse.json({ error: 'cardId requis' }, { status: 400 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('id, challenger_id, opponent_id, winner_id, phase, challenger_draft, opponent_draft, reward_card_id')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.phase !== 'pick_reward') return NextResponse.json({ error: 'Pas en phase récompense' }, { status: 400 })
  if (battle.winner_id !== user.id) return NextResponse.json({ error: 'Seul le gagnant peut choisir' }, { status: 403 })
  if (battle.reward_card_id) return NextResponse.json({ error: 'Récompense déjà réclamée' }, { status: 400 })

  const loserId = user.id === battle.challenger_id ? battle.opponent_id : battle.challenger_id
  const loserDraft = (battle.winner_id === battle.challenger_id ? battle.opponent_draft : battle.challenger_draft) as { id: string }[] | null

  if (!loserDraft?.find((c) => c.id === cardId)) {
    return NextResponse.json({ error: 'Cette carte ne fait pas partie du draft adverse' }, { status: 400 })
  }

  // Transfer card: remove from loser, give to winner
  await admin.from('user_cards').delete().eq('user_id', loserId).eq('card_id', cardId)
  await admin.from('user_cards').insert({ user_id: user.id, card_id: cardId, obtained_via: 'battle' })

  // Finalize battle
  await admin.from('battles').update({
    phase: 'finished',
    status: 'finished',
    reward_card_id: cardId,
  }).eq('id', battleId)

  // Log activity
  const { data: membership } = await admin.from('group_members').select('group_id').eq('user_id', user.id).single()
  if (membership) {
    const { data: winnerProfile } = await admin.from('users').select('pseudo').eq('id', user.id).single()
    await admin.from('group_activities').insert({
      group_id: membership.group_id,
      user_id: user.id,
      activity_type: 'battle_result',
      message: `${winnerProfile?.pseudo ?? '?'} a remporté un Draft Duel et récupéré une carte ⚔️🎴`,
    })
  }

  return NextResponse.json({ success: true })
}
