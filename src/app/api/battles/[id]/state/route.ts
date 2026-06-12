import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('phase, challenger_team, opponent_team, winner_id, match_events, final_score, match_start_at, challenger_cohesion, opponent_cohesion, reward_card_id')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })

  return NextResponse.json(battle)
}
