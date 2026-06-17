import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Called by GitHub Actions every 5 min — auto-launches matches when match_date is reached
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find upcoming matches whose scheduled time has passed
  const { data: tolaunch } = await admin
    .from('matches')
    .select('id, team_a, team_b, flag_a, flag_b')
    .eq('status', 'upcoming')
    .lte('match_date', new Date().toISOString())

  if (!tolaunch || tolaunch.length === 0) {
    return NextResponse.json({ launched: 0 })
  }

  const launched: string[] = []

  for (const match of tolaunch) {
    // Conditional update: only if still 'upcoming' (guard against race)
    const { data: updated } = await admin
      .from('matches')
      .update({ status: 'live', score_a: 0, score_b: 0 })
      .eq('id', match.id)
      .eq('status', 'upcoming')
      .select('id')

    if (!updated || updated.length === 0) continue

    launched.push(match.id)

    const fa = match.flag_a ?? ''
    const fb = match.flag_b ?? ''

    try {
      await sendPushToAll({
        title: `⚽ EN DIRECT — ${fa} ${match.team_a} vs ${match.team_b} ${fb}`,
        body: 'Le match vient de commencer ! Suivez le score en direct',
        url: '/dashboard',
        tag: `live-${match.id}`,
      })
    } catch (e) {
      console.warn('[auto-launch] push failed', e)
    }
  }

  return NextResponse.json({ launched: launched.length, matchIds: launched })
}
