import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'
import {
  fetchDayEvents, fetchEventById, fetchLineup,
  matchStatus, normalizeName, type SportsDBEvent,
} from '@/lib/sports-api'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Called by GitHub Actions every 5 min during match hours
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // 1. Check DB first — skip external API if no matches scheduled today
  const startWindow = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const endWindow = new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString()

  const { data: ourMatches } = await supabase
    .from('matches')
    .select('id, team_a, team_b, match_date, status, score_a, score_b, thesportsdb_id')
    .gte('match_date', startWindow)
    .lte('match_date', endWindow)

  if (!ourMatches || ourMatches.length === 0) {
    return NextResponse.json({ message: 'Aucun match dans la fenêtre', processed: 0 })
  }

  // 2. Only now call the external API (matches exist in DB)
  const sportsEvents = await fetchDayEvents(today)
  if (sportsEvents.length === 0) {
    return NextResponse.json({ message: 'Aucun match aujourd\'hui', processed: 0 })
  }

  const notifications: string[] = []

  for (const ourMatch of ourMatches) {
    // 3. Find the matching TheSportsDB event (by team names)
    let sportsEvent: SportsDBEvent | null = null

    if (ourMatch.thesportsdb_id) {
      sportsEvent = await fetchEventById(ourMatch.thesportsdb_id)
    } else {
      sportsEvent = sportsEvents.find((e) => {
        const home = normalizeName(e.strHomeTeam)
        const away = normalizeName(e.strAwayTeam)
        const teamA = normalizeName(ourMatch.team_a)
        const teamB = normalizeName(ourMatch.team_b)
        return (home === teamA && away === teamB) || (home === teamB && away === teamA)
      }) ?? null

      // Save the TheSportsDB ID for future polls
      if (sportsEvent) {
        await supabase
          .from('matches')
          .update({ thesportsdb_id: sportsEvent.idEvent })
          .eq('id', ourMatch.id)
      }
    }

    if (!sportsEvent) continue

    const status = matchStatus(sportsEvent.strStatus)
    const homeScore = sportsEvent.intHomeScore !== null ? parseInt(sportsEvent.intHomeScore) : null
    const awayScore = sportsEvent.intAwayScore !== null ? parseInt(sportsEvent.intAwayScore) : null

    // 4. Check for new events (prevent duplicates via match_live_events table)
    const eventKey = async (type: string, detail: string) => {
      const key = `${ourMatch.id}:${type}:${detail}`
      const { data: existing } = await supabase
        .from('match_live_events')
        .select('id')
        .eq('event_key', key)
        .single()
      if (existing) return false // already sent
      await supabase.from('match_live_events').insert({ match_id: ourMatch.id, event_key: key, event_type: type })
      return true
    }

    const sendToMatchPredictors = async (payload: Parameters<typeof sendPushToUser>[1]) => {
      const { data: predictors } = await supabase
        .from('predictions')
        .select('user_id')
        .eq('match_id', ourMatch.id)

      if (!predictors?.length) return 0
      const seen = new Set<string>()
      const userIds: string[] = []
      for (const p of predictors as { user_id: string }[]) {
        if (!seen.has(p.user_id)) { seen.add(p.user_id); userIds.push(p.user_id) }
      }
      await Promise.allSettled(userIds.map((uid) => sendPushToUser(uid as string, payload)))
      return userIds.length
    }

    const label = `${ourMatch.team_a} vs ${ourMatch.team_b}`

    // ── EVENT: Match started ──────────────────────────────────────────────
    if (status === 'live_1h' && await eventKey('match_started', '1h')) {
      const sent = await sendToMatchPredictors({
        title: `🏁 ${label} — C'est parti !`,
        body: 'Le match vient de commencer. Retour sur ton pronostic !',
        tag: 'match-live',
        url: '/matches',
      })
      notifications.push(`match_started:${label} (${sent} users)`)
    }

    // ── EVENT: Half-time ─────────────────────────────────────────────────
    if (status === 'half_time' && homeScore !== null && await eventKey('half_time', `${homeScore}-${awayScore}`)) {
      const sent = await sendToMatchPredictors({
        title: `⏱️ Mi-temps — ${label}`,
        body: `Score à la mi-temps : ${ourMatch.team_a} ${homeScore} - ${awayScore} ${ourMatch.team_b}`,
        tag: 'match-live',
        url: '/matches',
      })
      notifications.push(`half_time:${label} ${homeScore}-${awayScore} (${sent} users)`)
    }

    // ── EVENT: Goal (score changed) ──────────────────────────────────────
    const currentScore = `${homeScore}-${awayScore}`
    const dbScore = `${ourMatch.score_a ?? 'null'}-${ourMatch.score_b ?? 'null'}`
    if (
      homeScore !== null && awayScore !== null &&
      (status === 'live_1h' || status === 'live_2h' || status === 'extra_time') &&
      currentScore !== dbScore &&
      await eventKey('score', currentScore)
    ) {
      // Update our DB score
      await supabase.from('matches').update({ score_a: homeScore, score_b: awayScore, status: 'live' }).eq('id', ourMatch.id)

      const goalTeam = homeScore > (ourMatch.score_a ?? 0)
        ? ourMatch.team_a
        : ourMatch.team_b

      const sent = await sendToMatchPredictors({
        title: `⚽ BUT ! ${goalTeam} marque !`,
        body: `${ourMatch.team_a} ${homeScore} - ${awayScore} ${ourMatch.team_b}`,
        tag: 'match-goal',
        url: '/matches',
      })
      notifications.push(`goal:${label} ${currentScore} (${sent} users)`)
    }

    // ── EVENT: Full-time ─────────────────────────────────────────────────
    if (status === 'finished' && homeScore !== null && await eventKey('full_time', `${homeScore}-${awayScore}`)) {
      await supabase.from('matches').update({
        score_a: homeScore, score_b: awayScore, status: 'finished',
      }).eq('id', ourMatch.id)

      const sent = await sendToMatchPredictors({
        title: `🏆 Fin du match — ${label}`,
        body: `Score final : ${ourMatch.team_a} ${homeScore} - ${awayScore} ${ourMatch.team_b}. Résultat de ton pronostic disponible !`,
        tag: 'match-result',
        url: '/matches',
      })
      notifications.push(`full_time:${label} ${homeScore}-${awayScore} (${sent} users)`)
    }

    // ── EVENT: Lineup available (1h before kickoff) ──────────────────────
    const matchDate = new Date(ourMatch.match_date)
    const now = new Date()
    const diffMin = (matchDate.getTime() - now.getTime()) / 60000
    if (diffMin > 0 && diffMin <= 75 && await eventKey('lineup_check', 'done')) {
      const lineup = await fetchLineup(sportsEvent.idEvent)
      if (lineup.length > 0) {
        const homeTeamLineup = lineup.filter((p) => normalizeName(p.strTeam) === normalizeName(ourMatch.team_a))
        const awayTeamLineup = lineup.filter((p) => normalizeName(p.strTeam) === normalizeName(ourMatch.team_b))

        if (homeTeamLineup.length > 0 || awayTeamLineup.length > 0) {
          if (await eventKey('lineup_announced', sportsEvent.idEvent)) {
            const sent = await sendToMatchPredictors({
              title: `📋 Compos officielles — ${label}`,
              body: `Les compositions de ${ourMatch.team_a} et ${ourMatch.team_b} sont disponibles !`,
              tag: 'match-lineup',
              url: '/matches',
            })
            notifications.push(`lineup:${label} (${sent} users)`)
          }
        }
      }
    }
  }

  return NextResponse.json({
    date: today,
    matchesChecked: ourMatches.length,
    sportsEvents: sportsEvents.length,
    notifications,
  })
}
