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

  // Vérifier si l'utilisateur a déjà une battle active
  const { data: existing } = await admin
    .from('battles')
    .select('id, phase')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('type', 'team_match')
    .in('phase', ['team_selection', 'match_ready'])
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ battleId: existing[0].id, resuming: true })
  }

  const { data: profile } = await admin
    .from('users')
    .select('battles_played, coins')
    .eq('id', user.id)
    .single()

  const mySkill = calcSkill(profile ?? {})

  // Chercher un adversaire dans la file
  const { data: candidates } = await admin
    .from('battle_queue')
    .select('user_id, skill_rating')
    .neq('user_id', user.id)
    .gte('skill_rating', mySkill - SKILL_RANGE)
    .lte('skill_rating', mySkill + SKILL_RANGE)
    .order('created_at', { ascending: true })
    .limit(10)

  const opponent = candidates?.sort(
    (a, b) => Math.abs(a.skill_rating - mySkill) - Math.abs(b.skill_rating - mySkill)
  )[0] ?? null

  if (opponent) {
    // Retirer les deux de la file
    await admin.from('battle_queue').delete().in('user_id', [user.id, opponent.user_id])

    // coins_stake: 50 pour respecter la contrainte CHECK (>= 50)
    const { data: battle, error } = await admin
      .from('battles')
      .insert({
        challenger_id: user.id,
        opponent_id: opponent.user_id,
        coins_stake: 50,
        status: 'accepted',
        type: 'team_match',
        phase: 'team_selection',
      })
      .select('id')
      .single()

    if (error || !battle) {
      console.error('[battle create]', error?.message)
      return NextResponse.json({ error: 'Erreur création battle', detail: error?.message }, { status: 500 })
    }

    return NextResponse.json({ battleId: battle.id, matched: true })
  }

  // Pas d'adversaire — rejoindre la file
  await admin
    .from('battle_queue')
    .upsert({ user_id: user.id, skill_rating: mySkill }, { onConflict: 'user_id' })

  return NextResponse.json({ queued: true })
}
