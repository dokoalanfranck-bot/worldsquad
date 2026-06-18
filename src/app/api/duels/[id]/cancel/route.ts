import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: duel } = await admin
    .from('duels')
    .select('id, status, challenger_id, opponent_id, challenger_picks, opponent_picks, is_bot, challenger_score')
    .eq('id', duelId)
    .single()

  if (!duel) return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!['open', 'picking', 'stealing'].includes(duel.status)) {
    return NextResponse.json({ error: 'Impossible d\'annuler' }, { status: 404 })
  }

  const isQuitterChallenger = duel.challenger_id === user.id
  const winnerId = isQuitterChallenger ? duel.opponent_id : duel.challenger_id
  const quitterPicks = (isQuitterChallenger ? duel.challenger_picks : duel.opponent_picks) as Array<{ id: string }> | null

  // Forfeit: real opponent exists + quitter has submitted picks + not a bot game
  const canForfeit = duel.status !== 'open' && !duel.is_bot && winnerId && quitterPicks && quitterPicks.length > 0

  if (canForfeit) {
    const quitterPickIds = quitterPicks!.map((c) => c.id)
    await admin.from('duels').update({
      status: 'stealing',
      winner_id: winnerId,
      stolen_card_ids: quitterPickIds,
      updated_at: new Date().toISOString(),
    }).eq('id', duelId)
    return NextResponse.json({ success: true, forfeit: true })
  }

  await admin.from('duels').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', duelId)
  return NextResponse.json({ success: true })
}
