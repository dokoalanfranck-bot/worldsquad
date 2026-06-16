import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { trackAbandon } from '@/lib/battle-sanctions'

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
    .select('id, challenger_id, opponent_id, status')
    .eq('id', id)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!['waiting', 'picking', 'active'].includes(battle.status)) {
    return NextResponse.json({ error: 'Impossible d\'annuler' }, { status: 400 })
  }

  // Abandon si un adversaire était présent (picking ou active)
  const hasOpponent = !!battle.opponent_id
  if (hasOpponent && ['picking', 'active'].includes(battle.status)) {
    await trackAbandon(user.id, admin)
  }

  const reason = hasOpponent ? 'forfeit' : 'no_opponent'
  await admin
    .from('penalty_battles')
    .update({ status: 'cancelled', cancelled_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
