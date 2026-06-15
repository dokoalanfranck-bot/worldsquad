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
    .select('id, status, challenger_id')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in('status', ['open', 'picking'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (active && active.length > 0) {
    const myDuel = active[0]

    // Already matched — stay in this duel
    if (myDuel.status === 'picking') {
      return NextResponse.json({ duelId: myDuel.id, joined: false })
    }

    // I'm the challenger of an unmatched open duel — check if another player is also waiting.
    // This resolves the race condition where both players click simultaneously and each
    // creates their own duel before seeing the other's.
    if (myDuel.challenger_id === user.id) {
      const cutoff = new Date(Date.now() - 80000).toISOString()
      const { data: otherDuels } = await admin
        .from('duels')
        .select('id')
        .eq('status', 'open')
        .eq('is_bot', false)
        .is('opponent_id', null)
        .neq('challenger_id', user.id)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: true })
        .limit(1)

      if (otherDuels && otherDuels.length > 0) {
        const targetId = otherDuels[0].id
        const deadline = new Date(Date.now() + 30000).toISOString()

        const { data: joined } = await admin
          .from('duels')
          .update({ opponent_id: user.id, status: 'picking', picks_deadline: deadline })
          .eq('id', targetId)
          .eq('status', 'open')
          .select('id')

        if (joined && joined.length > 0) {
          // Delete my orphaned open duel now that I've joined the other player's duel
          await admin.from('duels').delete().eq('id', myDuel.id).eq('status', 'open')
          return NextResponse.json({ duelId: targetId, joined: true })
        }
      }
    }

    return NextResponse.json({ duelId: myDuel.id, joined: false })
  }

  // Join an open duel from another player (created in last 80s — matches the 50s bot timer + buffer)
  const cutoff = new Date(Date.now() - 80000).toISOString()
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
    const { data: updated } = await admin
      .from('duels')
      .update({ opponent_id: user.id, status: 'picking', picks_deadline: deadline })
      .eq('id', duelId)
      .eq('status', 'open')
      .select('id')

    if (updated && updated.length > 0) {
      return NextResponse.json({ duelId, joined: true })
    }
    // Update failed — duel was taken concurrently, fall through to create a new one
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
