import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Vercel Cron / GitHub Actions — runs every 5 min
// Logic based solely on match_date from the DB — no external API needed:
//   upcoming  → live     when match_date   <= now
//   live      → finished when match_date + 110 min <= now  (90min + ~20min arrêts de jeu)

const MATCH_DURATION_MS = 110 * 60 * 1000

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const cutoffLive = new Date(now.getTime() - MATCH_DURATION_MS).toISOString()

  // ── 1. upcoming → live ──────────────────────────────────────────────────────
  const { data: toStart } = await admin
    .from('matches')
    .select('id, team_a, team_b, flag_a, flag_b')
    .eq('status', 'upcoming')
    .lte('match_date', nowIso)

  let started = 0
  for (const match of toStart ?? []) {
    const { error } = await admin
      .from('matches')
      .update({ status: 'live' })
      .eq('id', match.id)
      .eq('status', 'upcoming')

    if (error) { console.error('[kick-off] start failed:', match.id, error); continue }
    started++

    await sendPushToAll({
      title: `⚽ EN DIRECT — ${match.flag_a ?? ''} ${match.team_a} vs ${match.team_b} ${match.flag_b ?? ''}`,
      body: 'Le match vient de commencer ! Les pronostics sont fermés.',
      url: '/matches',
      tag: `kickoff-${match.id}`,
    }).catch(() => {})
  }

  // ── 2. live → finished (après 110 minutes) ──────────────────────────────────
  const { data: toFinish } = await admin
    .from('matches')
    .select('id, team_a, team_b, flag_a, flag_b, score_a, score_b')
    .eq('status', 'live')
    .lte('match_date', cutoffLive)

  let finished = 0
  for (const match of toFinish ?? []) {
    const { error } = await admin
      .from('matches')
      .update({ status: 'finished' })
      .eq('id', match.id)
      .eq('status', 'live')

    if (error) { console.error('[kick-off] finish failed:', match.id, error); continue }
    finished++

    // Déclencher le calcul des pronostics
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await fetch(`${baseUrl}/api/admin/calculate-match/${match.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}` },
    }).catch(() => {})

    // Push résultat final
    const sa = match.score_a ?? 0
    const sb = match.score_b ?? 0
    const winner = sa > sb ? match.team_a : sb > sa ? match.team_b : null
    await sendPushToAll({
      title: `🏁 ${match.flag_a ?? ''} ${match.team_a} ${sa} — ${sb} ${match.team_b} ${match.flag_b ?? ''}`,
      body: winner ? `Victoire de ${winner} ! Vérifiez vos pronostics` : 'Match nul ! Vérifiez vos pronostics',
      url: '/matches',
      tag: `finished-${match.id}`,
    }).catch(() => {})
  }

  return NextResponse.json({ started, finished, timestamp: nowIso })
}
