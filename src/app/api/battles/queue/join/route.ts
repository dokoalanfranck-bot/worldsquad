import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function calcSkill(user: { battles_played?: number; coins?: number }): number {
  return (user.battles_played ?? 0) * 10 + Math.floor((user.coins ?? 0) / 100)
}

export async function POST(_req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users')
    .select('battles_played, coins')
    .eq('id', user.id)
    .single()

  const mySkill = calcSkill(profile ?? {})

  const { data, error } = await admin.rpc('join_matchmaking', {
    p_user_id: user.id,
    p_skill: mySkill,
  })

  if (error) {
    console.error('[join_matchmaking]', error)
    return NextResponse.json({ error: 'Erreur matchmaking' }, { status: 500 })
  }

  return NextResponse.json(data)
}
