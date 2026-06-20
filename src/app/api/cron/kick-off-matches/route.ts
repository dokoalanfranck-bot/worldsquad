import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Vercel Cron / GitHub Actions — runs every 5 min
// Automatically transitions matches from 'upcoming' → 'live' when match_date is reached
// This locks predictions and sends a push notification to all users

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Find all upcoming matches whose kick-off time has passed
  const { data: toStart, error } = await admin
    .from('matches')
    .select('id, team_a, team_b, flag_a, flag_b, match_date')
    .eq('status', 'upcoming')
    .lte('match_date', now)

  if (error) {
    console.error('[kick-off-matches] select failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!toStart || toStart.length === 0) {
    return NextResponse.json({ started: 0, message: 'Aucun match à lancer' })
  }

  let started = 0

  for (const match of toStart) {
    const { error: updateErr } = await admin
      .from('matches')
      .update({ status: 'live' })
      .eq('id', match.id)
      .eq('status', 'upcoming') // guard contre les updates concurrentes

    if (updateErr) {
      console.error(`[kick-off-matches] update failed for ${match.id}:`, updateErr)
      continue
    }

    started++

    const fa = match.flag_a ?? '⚽'
    const fb = match.flag_b ?? '⚽'

    await sendPushToAll({
      title: `⚽ EN DIRECT — ${fa} ${match.team_a} vs ${match.team_b} ${fb}`,
      body: 'Le match vient de commencer ! Les pronostics sont fermés.',
      url: '/matches',
      tag: `kickoff-${match.id}`,
    }).catch((e) => console.warn('[kick-off push]', e))
  }

  console.log(`[kick-off-matches] ${started}/${toStart.length} match(es) passés à live`)
  return NextResponse.json({ started, checked: toStart.length, timestamp: now })
}
