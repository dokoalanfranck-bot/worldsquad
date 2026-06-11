import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const opponentId: string = body.opponentId
  if (!opponentId) return NextResponse.json({ error: 'opponentId requis' }, { status: 400 })

  const admin = createAdminClient()

  // Vérifier si un battle existe déjà entre ces deux joueurs
  const { data: existing } = await admin
    .from('battles')
    .select('id')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('type', 'team_match')
    .in('phase', ['team_selection', 'match_ready'])
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ battleId: existing[0].id, existing: true })
  }

  const { data: battle, error } = await admin
    .from('battles')
    .insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      coins_stake: 50,
      status: 'accepted',
      type: 'team_match',
      phase: 'team_selection',
    })
    .select('id')
    .single()

  if (error || !battle) {
    console.error('[create-team-match]', error?.message)
    return NextResponse.json({ error: error?.message ?? 'Erreur création' }, { status: 500 })
  }

  return NextResponse.json({ battleId: battle.id })
}
