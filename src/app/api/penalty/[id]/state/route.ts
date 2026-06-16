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

  const playerIds = [battle.challenger_id, battle.opponent_id].filter(Boolean)
  const { data: profiles } = await admin
    .from('users')
    .select('id, pseudo, photo_url, nation')
    .in('id', playerIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const isChallenger = user.id === battle.challenger_id
  const myPicksSubmitted = isChallenger ? !!battle.challenger_picks : !!battle.opponent_picks

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
    opponent: battle.opponent_id ? (profileMap.get(battle.opponent_id) ?? null) : null,
    myPicksSubmitted,
    myChoice: myChoice?.choice ?? null,
  })
}
