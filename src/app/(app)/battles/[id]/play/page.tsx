import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { PlayClient } from './PlayClient'

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Récupérer la battle seule (pas de FK join pour éviter les erreurs)
  const { data: battle } = await admin
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (!battle) notFound()
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) redirect('/battles')

  // Récupérer les profils et la reward card en parallèle
  const [
    { data: challenger },
    { data: opponent },
    { data: myCardsRaw },
    { data: rewardCard },
  ] = await Promise.all([
    admin.from('users').select('id, pseudo, nation, photo_url, coins').eq('id', battle.challenger_id).single(),
    admin.from('users').select('id, pseudo, nation, photo_url, coins').eq('id', battle.opponent_id).single(),
    admin.from('user_cards')
      .select('card:cards(id, name, rarity, image_url, stats, type, nation)')
      .eq('user_id', user.id),
    battle.reward_card_id
      ? admin.from('cards').select('id, name, rarity, image_url, stats, type, nation, position, flag').eq('id', battle.reward_card_id).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  const myCards = (myCardsRaw ?? []).map((uc) => uc.card).filter(Boolean)

  const battleWithRelations = {
    ...battle,
    challenger,
    opponent,
    reward_card: rewardCard ?? null,
  }

  return (
    <PlayClient
      initialBattle={battleWithRelations}
      currentUserId={user.id}
      myCards={myCards as never}
    />
  )
}
