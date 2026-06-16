import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('penalty_battles')
    .select('*')
    .eq('id', id)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Load player profiles
  const playerIds = [battle.challenger_id, battle.opponent_id].filter(Boolean)
  const { data: profiles } = await admin
    .from('users')
    .select('id, pseudo, photo_url, nation')
    .in('id', playerIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  // Load wager cards
  async function loadWagerCard(userCardId: string | null) {
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
    loadWagerCard(battle.challenger_wager),
    loadWagerCard(battle.opponent_wager),
  ])

  // Load current user's choice for this round (anti-cheat: only own choice)
  const { data: myChoice } = await admin
    .from('penalty_choices')
    .select('choice')
    .eq('battle_id', id)
    .eq('round_number', battle.current_round)
    .eq('player_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    battle,
    challenger: profileMap.get(battle.challenger_id) ?? null,
    opponent: battle.opponent_id ? profileMap.get(battle.opponent_id) ?? null : null,
    challengerCard,
    opponentCard,
    myChoice: myChoice?.choice ?? null,
  })
}
