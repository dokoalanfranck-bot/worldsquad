import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SKILL_RANGE = 500

function calcSkill(user: { battles_played?: number; coins?: number }): number {
  return (user.battles_played ?? 0) * 10 + Math.floor((user.coins ?? 0) / 100)
}

export async function POST(_req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  // Check already in active draft_duel
  const { data: active } = await admin
    .from('battles')
    .select('id, phase')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('type', 'draft_duel')
    .not('phase', 'in', '("finished","declined")')
    .single()

  if (active) {
    return NextResponse.json({ battleId: active.id, resuming: true })
  }

  // Get user profile for skill
  const { data: profile } = await admin
    .from('users')
    .select('battles_played, coins')
    .eq('id', user.id)
    .single()

  const mySkill = calcSkill(profile ?? {})

  // Look for opponent in queue (closest skill, not self)
  const { data: candidates } = await admin
    .from('battle_queue')
    .select('user_id, skill_rating')
    .neq('user_id', user.id)
    .gte('skill_rating', mySkill - SKILL_RANGE)
    .lte('skill_rating', mySkill + SKILL_RANGE)
    .order('created_at', { ascending: true })
    .limit(10)

  // Pick closest skill
  const opponent = candidates?.sort(
    (a, b) => Math.abs(a.skill_rating - mySkill) - Math.abs(b.skill_rating - mySkill)
  )[0] ?? null

  if (opponent) {
    // Remove both from queue
    await admin.from('battle_queue').delete().in('user_id', [user.id, opponent.user_id])

    // Create draft_duel battle
    const { data: battle, error } = await admin
      .from('battles')
      .insert({
        challenger_id: user.id,
        opponent_id: opponent.user_id,
        coins_stake: 0,
        status: 'accepted',
        type: 'draft_duel',
        phase: 'draft',
        round_picks: {},
        current_round: 1,
      })
      .select('id')
      .single()

    if (error || !battle) {
      return NextResponse.json({ error: 'Erreur création battle' }, { status: 500 })
    }

    return NextResponse.json({ battleId: battle.id, matched: true })
  }

  // No opponent found — join queue
  await admin
    .from('battle_queue')
    .upsert({ user_id: user.id, skill_rating: mySkill }, { onConflict: 'user_id' })

  return NextResponse.json({ queued: true })
}
