import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isBot, botSelectTeam } from '@/lib/battle-bot'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })

  // Only useful in team_selection phase
  if (battle.phase !== 'team_selection') {
    return NextResponse.json({ success: true, skipped: true })
  }

  // Determine which side the caller is and who the bot is
  const isChallenger = battle.challenger_id === user.id
  const isOpponent = battle.opponent_id === user.id
  if (!isChallenger && !isOpponent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Human must have already submitted their team
  const humanTeam = isChallenger ? battle.challenger_team : battle.opponent_team
  if (!humanTeam) return NextResponse.json({ error: 'Soumets ton équipe d\'abord' }, { status: 400 })

  const botId = isChallenger ? battle.opponent_id : battle.challenger_id

  // Opponent must be a bot
  if (!await isBot(botId as string)) {
    return NextResponse.json({ success: true, skipped: true, reason: 'not_a_bot' })
  }

  // Bot already selected — nothing to do
  const botTeam = isChallenger ? battle.opponent_team : battle.challenger_team
  if (botTeam) return NextResponse.json({ success: true, skipped: true, reason: 'already_selected' })

  // Run bot selection synchronously
  await botSelectTeam(battleId, botId as string)

  return NextResponse.json({ success: true })
}
