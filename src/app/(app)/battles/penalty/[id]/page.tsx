import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PenaltyClient } from './PenaltyClient'
import type { Card } from '@/types'

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

  // Load user's cards for the picking phase
  const { data: userCardsRaw } = await admin
    .from('user_cards')
    .select('card:cards(id, name, rarity, image_url, stats, type, nation, description, created_at)')
    .eq('user_id', user.id)
    .order('obtained_at', { ascending: false })
    .limit(80)

  const myCards = (userCardsRaw ?? [])
    .map((uc) => {
      const raw = uc as { card: unknown }
      return Array.isArray(raw.card) ? raw.card[0] : raw.card
    })
    .filter(Boolean) as Card[]

  // Check if current user already submitted picks
  const isChallenger = user.id === battle.challenger_id
  const initialMyPicksSubmitted = isChallenger
    ? battle.challenger_picks !== null
    : battle.opponent_picks !== null

  // Check current round choice
  const { data: myChoiceRow } = await admin
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
      myCards={myCards}
      initialMyPicksSubmitted={initialMyPicksSubmitted}
      initialMyChoice={myChoiceRow?.choice ?? null}
    />
  )
}
