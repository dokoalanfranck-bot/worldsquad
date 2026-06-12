import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('id, winner_id, phase')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.phase === 'finished') return NextResponse.json({ success: true, alreadyDone: true })
  if (battle.phase !== 'pick_reward') return NextResponse.json({ error: 'Phase incorrecte' }, { status: 400 })
  if (battle.winner_id !== user.id) return NextResponse.json({ error: 'Seul le gagnant peut terminer' }, { status: 403 })

  await admin
    .from('battles')
    .update({ phase: 'finished', status: 'finished' })
    .eq('id', battleId)
    .eq('phase', 'pick_reward')

  return NextResponse.json({ success: true })
}
