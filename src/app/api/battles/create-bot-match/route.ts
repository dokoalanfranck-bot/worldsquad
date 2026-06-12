import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pickRandomBot } from '@/lib/battle-bot'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  // Don't create a second battle if one already exists
  const { data: existing } = await admin
    .from('battles')
    .select('id')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('type', 'team_match')
    .in('phase', ['team_selection', 'match_ready', 'pick_reward'])
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ battleId: existing[0].id, existing: true })
  }

  const botId = await pickRandomBot()
  if (!botId) {
    return NextResponse.json({ error: 'Aucun bot disponible — contacte un admin' }, { status: 503 })
  }

  const { data: battle, error } = await admin
    .from('battles')
    .insert({
      challenger_id: user.id,
      opponent_id: botId,
      coins_stake: 50,
      status: 'accepted',
      type: 'team_match',
      phase: 'team_selection',
    })
    .select('id')
    .single()

  if (error || !battle) {
    return NextResponse.json({ error: error?.message ?? 'Erreur création' }, { status: 500 })
  }

  return NextResponse.json({ battleId: battle.id, isBot: true })
}
