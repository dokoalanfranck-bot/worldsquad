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

  // Check friendship in both directions (two separate queries — avoids nested or/and)
  const [{ data: fs1 }, { data: fs2 }] = await Promise.all([
    admin.from('friendships').select('id').eq('requester_id', user.id).eq('addressee_id', friendId).eq('status', 'accepted').maybeSingle(),
    admin.from('friendships').select('id').eq('requester_id', friendId).eq('addressee_id', user.id).eq('status', 'accepted').maybeSingle(),
  ])
  const friendship = fs1 ?? fs2

  if (!friendship) {
    return NextResponse.json({ error: 'Pas amis' }, { status: 403 })
  }

  const { data: challenger } = await admin
    .from('users')
    .select('pseudo')
    .eq('id', user.id)
    .single()

  // Build insert payload — invite_expires_at is optional (requires migration 013)
  const inviteExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: Record<string, any> = {
    challenger_id:    user.id,
    opponent_id:      friendId,
    stake_count:      stake,
    is_friend_battle: true,
    status:           'invited',
    coins_stake:      50 * stake,
  }

  // Try with invite_expires_at first, fall back without it if the column doesn't exist yet
  let duel: { id: string } | null = null
  const { data: d1, error: e1 } = await admin.from('duels').insert({ ...insertPayload, invite_expires_at: inviteExpires }).select('id').single()
  if (e1) {
    // Column might not exist yet (migration 013 pending) — retry without it
    const { data: d2, error: e2 } = await admin.from('duels').insert(insertPayload).select('id').single()
    if (e2 || !d2) return NextResponse.json({ error: e2?.message ?? 'Erreur création duel' }, { status: 500 })
    duel = d2
  } else {
    duel = d1
  }

  // Push notification to friend
  await sendPushToUser(friendId, {
    title: `⚔️ Défi de ${challenger?.pseudo ?? 'Quelqu\'un'}`,
    body:  `Mise : ${stake} carte${stake > 1 ? 's' : ''} — Accepte le défi !`,
    url:   `/battles/duel/${duel!.id}`,
  }).catch(() => { /* ignore push errors */ })

  return NextResponse.json({ duelId: duel!.id })
}
