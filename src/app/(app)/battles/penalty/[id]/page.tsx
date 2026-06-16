import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PenaltyClient } from './PenaltyClient'

export default async function PenaltyBattlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('penalty_battles')
    .select('*')
    .eq('id', id)
    .single()

  if (!battle) redirect('/battles')
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) redirect('/battles')

  const playerIds = [battle.challenger_id, battle.opponent_id].filter(Boolean)
  const { data: profiles } = await admin
    .from('users')
    .select('id, pseudo, photo_url, nation')
    .in('id', playerIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  async function loadCard(userCardId: string | null) {
    if (!userCardId) return null
    const { data } = await admin
      .from('user_cards')
      .select('id, card_id, card:cards(id, name, rarity, image_url, stats, type)')
      .eq('id', userCardId)
      .maybeSingle()
    if (!data) return null
    const raw = data as { id: string; card_id: string; card: unknown }
    const cardArr = Array.isArray(raw.card) ? raw.card[0] : raw.card
    return { id: raw.id, card_id: raw.card_id, card: cardArr }
  }

  const [challengerCard, opponentCard] = await Promise.all([
    loadCard(battle.challenger_wager),
    loadCard(battle.opponent_wager),
  ])

  const { data: myChoice } = await admin
    .from('penalty_choices')
    .select('choice')
    .eq('battle_id', id)
    .eq('round_number', battle.current_round)
    .eq('player_id', user.id)
    .maybeSingle()

  return (
    <PenaltyClient
      initialBattle={battle}
      currentUserId={user.id}
      challenger={profileMap.get(battle.challenger_id) ?? null}
      opponent={battle.opponent_id ? (profileMap.get(battle.opponent_id) ?? null) : null}
      challengerCard={challengerCard}
      opponentCard={opponentCard}
      initialMyChoice={myChoice?.choice ?? null}
    />
  )
}
