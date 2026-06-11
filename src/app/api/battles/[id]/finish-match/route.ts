import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })

  // Idempotent — si déjà finished, pas d'erreur
  if (battle.phase === 'finished') return NextResponse.json({ success: true, alreadyDone: true })
  if (battle.phase !== 'match_ready') return NextResponse.json({ error: 'Phase incorrecte' }, { status: 400 })

  const winnerId = battle.winner_id as string | null
  const loserId = winnerId
    ? (winnerId === battle.challenger_id ? battle.opponent_id : battle.challenger_id)
    : null

  // Transition atomique — si une autre requête est passée en premier, le count sera 0
  const { count } = await admin
    .from('battles')
    .update({ phase: 'finished', status: 'finished' })
    .eq('id', battleId)
    .eq('phase', 'match_ready')
    .select('id', { count: 'exact', head: true })

  if (!count) return NextResponse.json({ success: true, alreadyDone: true })

  // Mise à jour des stats vainqueur
  if (winnerId) {
    const { data: winnerProfile } = await admin
      .from('users')
      .select('battle_streak, best_streak, battles_played')
      .eq('id', winnerId)
      .single()

    const newStreak = (winnerProfile?.battle_streak ?? 0) + 1
    await admin.from('users').update({
      battle_streak: newStreak,
      best_streak: Math.max(newStreak, winnerProfile?.best_streak ?? 0),
      battles_played: (winnerProfile?.battles_played ?? 0) + 1,
    }).eq('id', winnerId)
  }

  // Mise à jour des stats perdant
  if (loserId) {
    const { data: loserProfile } = await admin
      .from('users')
      .select('battles_played')
      .eq('id', loserId)
      .single()

    await admin.from('users').update({
      battle_streak: 0,
      battles_played: (loserProfile?.battles_played ?? 0) + 1,
    }).eq('id', loserId)
  }

  return NextResponse.json({ success: true })
}
