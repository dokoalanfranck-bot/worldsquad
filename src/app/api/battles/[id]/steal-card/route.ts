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

  const { cardId } = await req.json() as { cardId: string }
  if (!cardId) return NextResponse.json({ error: 'cardId requis' }, { status: 400 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('id, challenger_id, opponent_id, winner_id, phase, reward_card_id')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.phase !== 'pick_reward') return NextResponse.json({ error: 'Phase incorrecte' }, { status: 400 })
  if (battle.winner_id !== user.id) return NextResponse.json({ error: 'Seul le gagnant peut choisir' }, { status: 403 })
  if (battle.reward_card_id) return NextResponse.json({ error: 'Récompense déjà réclamée' }, { status: 400 })

  const loserId = user.id === battle.challenger_id ? battle.opponent_id : battle.challenger_id

  // Vérifier que la carte appartient bien au perdant
  const { data: ownership } = await admin
    .from('user_cards')
    .select('id')
    .eq('user_id', loserId)
    .eq('card_id', cardId)
    .single()

  if (!ownership) {
    return NextResponse.json({ error: 'Cette carte n\'appartient pas à l\'adversaire' }, { status: 400 })
  }

  // Transfert atomique : retirer au perdant, donner au gagnant
  await admin.from('user_cards').delete().eq('user_id', loserId).eq('card_id', cardId)
  await admin.from('user_cards').upsert(
    { user_id: user.id, card_id: cardId, obtained_via: 'battle' },
    { onConflict: 'user_id,card_id' }
  )

  // Finaliser la battle
  await admin
    .from('battles')
    .update({ phase: 'finished', status: 'finished', reward_card_id: cardId })
    .eq('id', battleId)

  // Log group activity
  try {
    const { data: membership } = await admin
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .single()

    if (membership) {
      const [{ data: winnerProfile }, { data: cardData }] = await Promise.all([
        admin.from('users').select('pseudo').eq('id', user.id).single(),
        admin.from('cards').select('name').eq('id', cardId).single(),
      ])
      await admin.from('group_activities').insert({
        group_id: membership.group_id,
        user_id: user.id,
        activity_type: 'battle_result',
        message: `${winnerProfile?.pseudo ?? '?'} a gagné une battle et volé "${cardData?.name ?? '?'}" ⚔️🎴`,
      })
    }
  } catch { /* non bloquant */ }

  return NextResponse.json({ success: true })
}
