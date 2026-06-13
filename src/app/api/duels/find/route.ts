import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  // Already in an active duel?
  const { data: active } = await admin
    .from('duels')
    .select('id, status')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in('status', ['open', 'picking'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (active && active.length > 0) {
    return NextResponse.json({ duelId: active[0].id, joined: false })
  }

  // Join an open duel from another player (created in last 20s)
  const cutoff = new Date(Date.now() - 20000).toISOString()
  const { data: openDuels } = await admin
    .from('duels')
    .select('id')
    .eq('status', 'open')
    .eq('is_bot', false)
    .is('opponent_id', null)
    .neq('challenger_id', user.id)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(1)

  if (openDuels && openDuels.length > 0) {
    const duelId = openDuels[0].id
    const deadline = new Date(Date.now() + 30000).toISOString()
    await admin
      .from('duels')
      .update({ opponent_id: user.id, status: 'picking', picks_deadline: deadline })
      .eq('id', duelId)
      .eq('status', 'open') // atomic: prevent double-join
    return NextResponse.json({ duelId, joined: true })
  }

  // Create a new open duel
  const { data: duel, error } = await admin
    .from('duels')
    .insert({ challenger_id: user.id, coins_stake: 50 })
    .select('id')
    .single()

  if (error || !duel) {
    return NextResponse.json({ error: error?.message ?? 'Erreur création' }, { status: 500 })
  }

  return NextResponse.json({ duelId: duel.id, joined: false })
}
