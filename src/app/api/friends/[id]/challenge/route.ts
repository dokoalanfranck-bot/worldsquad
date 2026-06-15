import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: friendId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { stakeCount } = await req.json() as { stakeCount: number }
  const stake = Math.max(1, Math.min(3, Math.round(stakeCount ?? 1)))

  const admin = createAdminClient()

  // Verify friendship
  const { data: friendship } = await admin
    .from('friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),` +
      `and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )
    .eq('status', 'accepted')
    .limit(1)
    .single()

  if (!friendship) {
    return NextResponse.json({ error: 'Pas amis' }, { status: 403 })
  }

  const { data: challenger } = await admin
    .from('users')
    .select('pseudo')
    .eq('id', user.id)
    .single()

  const inviteExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { data: duel, error } = await admin
    .from('duels')
    .insert({
      challenger_id:    user.id,
      opponent_id:      friendId,
      stake_count:      stake,
      is_friend_battle: true,
      status:           'invited',
      coins_stake:      50 * stake,
      invite_expires_at: inviteExpires,
    })
    .select('id')
    .single()

  if (error || !duel) {
    return NextResponse.json({ error: error?.message ?? 'Erreur' }, { status: 500 })
  }

  // Push notification to friend
  await sendPushToUser(friendId, {
    title: `⚔️ Défi de ${challenger?.pseudo ?? 'Quelqu\'un'}`,
    body:  `Mise : ${stake} carte${stake > 1 ? 's' : ''} — Accepte le défi !`,
    url:   `/battles/duel/${duel.id}`,
  }).catch(() => { /* ignore push errors */ })

  return NextResponse.json({ duelId: duel.id })
}
