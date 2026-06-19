import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { originalDuelId } = await req.json() as { originalDuelId?: string }
  if (!originalDuelId) return NextResponse.json({ error: 'originalDuelId requis' }, { status: 400 })

  const admin = createAdminClient()

  const { data: original } = await admin
    .from('duels')
    .select('id, challenger_id, opponent_id, is_bot, status')
    .eq('id', originalDuelId)
    .single()

  if (!original) return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })
  if (original.is_bot) return NextResponse.json({ error: 'Pas de revanche contre les bots' }, { status: 400 })
  if (original.status !== 'finished') return NextResponse.json({ error: 'Duel non terminé' }, { status: 400 })

  const isChallenger = original.challenger_id === user.id
  const isOpponent   = original.opponent_id   === user.id
  if (!isChallenger && !isOpponent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const opponentId = isChallenger ? original.opponent_id : original.challenger_id
  if (!opponentId) return NextResponse.json({ error: 'Adversaire introuvable' }, { status: 400 })

  // Return existing pending invite if already sent
  const { data: existing } = await admin
    .from('duels')
    .select('id')
    .eq('challenger_id', user.id)
    .eq('opponent_id', opponentId)
    .eq('status', 'invited')
    .maybeSingle()

  if (existing) return NextResponse.json({ duelId: existing.id })

  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()
  const { data: newDuel } = await admin
    .from('duels')
    .insert({
      challenger_id:     user.id,
      opponent_id:       opponentId,
      status:            'invited',
      stake_count:       1,
      invite_expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (!newDuel) return NextResponse.json({ error: 'Erreur création duel' }, { status: 500 })

  return NextResponse.json({ duelId: newDuel.id })
}
