import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
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
    .select('id, challenger_id, opponent_id, status, is_bot, challenger_picks, opponent_picks')
    .eq('id', id)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!['waiting', 'picking', 'active', 'stealing'].includes(battle.status)) {
    return NextResponse.json({ error: 'Impossible d\'annuler' }, { status: 400 })
  }

  const isQuitterChallenger = battle.challenger_id === user.id
  const winnerId = isQuitterChallenger ? battle.opponent_id : battle.challenger_id
  const quitterPicks = (isQuitterChallenger ? battle.challenger_picks : battle.opponent_picks) as Array<{ id: string }> | null

  // Forfeit: real opponent, quitter has submitted picks, not bot, not waiting
  const canForfeit = battle.status !== 'waiting' && !(battle as Record<string, unknown>).is_bot && winnerId && quitterPicks && quitterPicks.length > 0

  if (canForfeit) {
    await admin.from('penalty_battles').update({
      status: 'stealing',
      winner_id: winnerId,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    return NextResponse.json({ success: true, forfeit: true })
  }

  await admin.from('penalty_battles').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  return NextResponse.json({ success: true })
}
