import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const now = new Date()
  const in55min = new Date(now.getTime() + 55 * 60 * 1000).toISOString()
  const in65min = new Date(now.getTime() + 65 * 60 * 1000).toISOString()

  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date')
    .gte('match_date', in55min)
    .lte('match_date', in65min)
    .eq('status', 'scheduled')

  if (!upcomingMatches || upcomingMatches.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Aucun match dans 1h' })
  }

  let totalSent = 0

  for (const match of upcomingMatches) {
    const { data: predictions } = await supabase
      .from('predictions')
      .select('user_id')
      .eq('match_id', match.id)

    if (!predictions || predictions.length === 0) continue

    const seen = new Set<string>()
    const userIds: string[] = []
    for (const p of predictions as { user_id: string }[]) {
      if (!seen.has(p.user_id)) { seen.add(p.user_id); userIds.push(p.user_id) }
    }

    await Promise.allSettled(
      userIds.map((userId) =>
        sendPushToUser(userId as string, {
          title: '⚽ Match dans 1 heure !',
          body: `${match.home_team} vs ${match.away_team} commence bientôt. Vérifie ton pronostic !`,
          tag: 'match-reminder',
          url: '/matches',
        })
      )
    )

    totalSent += userIds.length
  }

  return NextResponse.json({ sent: totalSent, matches: upcomingMatches.length })
}
