import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { trackAbandon } from '@/lib/battle-sanctions'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: duel } = await admin
    .from('duels')
    .select('id, status, challenger_id, opponent_id, is_bot')
    .eq('id', duelId)
    .in('status', ['open', 'picking'])
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .single()

  if (!duel) {
    return NextResponse.json({ error: 'Duel introuvable ou déjà en cours de jeu' }, { status: 404 })
  }

  // Cancel pendant la phase picking avec un adversaire humain = abandon
  const hasHumanOpponent = duel.status === 'picking' && !duel.is_bot && duel.opponent_id
  if (hasHumanOpponent) {
    await trackAbandon(user.id, admin)
  }

  await admin
    .from('duels')
    .update({ status: 'cancelled', cancelled_reason: hasHumanOpponent ? 'forfeit' : 'no_opponent' })
    .eq('id', duelId)

  return NextResponse.json({ success: true })
}
