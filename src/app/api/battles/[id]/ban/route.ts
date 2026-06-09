import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALL_STATS = ['pace', 'shooting', 'passing', 'defending', 'dribbling', 'physical']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { stat } = await req.json() as { stat: string }
  if (!ALL_STATS.includes(stat)) return NextResponse.json({ error: 'Stat invalide' }, { status: 400 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('id, challenger_id, opponent_id, phase, challenger_ban, opponent_ban')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.phase !== 'ban') return NextResponse.json({ error: 'Pas en phase ban' }, { status: 400 })

  const isChallenger = battle.challenger_id === user.id
  const isOpponent = battle.opponent_id === user.id
  if (!isChallenger && !isOpponent) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  // Challenger bans first
  if (isChallenger && battle.challenger_ban) return NextResponse.json({ error: 'Déjà banni' }, { status: 400 })
  if (isOpponent && !battle.challenger_ban) return NextResponse.json({ error: 'Attends que le challenger banne d\'abord' }, { status: 400 })
  if (isOpponent && battle.opponent_ban) return NextResponse.json({ error: 'Déjà banni' }, { status: 400 })

  const banField = isChallenger ? 'challenger_ban' : 'opponent_ban'
  const otherBan = isChallenger ? battle.opponent_ban : battle.challenger_ban

  const update: Record<string, unknown> = { [banField]: stat }

  if (otherBan !== null || isOpponent) {
    // Both banned — compute available stats
    const banned = new Set([
      isChallenger ? stat : battle.challenger_ban,
      isOpponent ? stat : battle.opponent_ban,
    ])
    update.available_stats = ALL_STATS.filter((s) => !banned.has(s))
    update.phase = 'round_1'
    update.current_round = 1
  }

  await admin.from('battles').update(update).eq('id', battleId)

  return NextResponse.json({ success: true })
}
