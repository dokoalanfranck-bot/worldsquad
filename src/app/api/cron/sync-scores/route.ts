import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel Cron: runs every minute
// Config in vercel.json — path: /api/cron/sync-scores
// Auth: Authorization: Bearer <CRON_SECRET>
//
// Env vars required:
//   RAPIDAPI_KEY       — clé RapidAPI (api-football-v1.p.rapidapi.com)
//   FOOTBALL_LEAGUE_ID — ID de la compétition (ex: 1 = World Cup)
//   FOOTBALL_SEASON    — Saison (ex: 2026)
//   CRON_SECRET        — secret pour sécuriser l'endpoint

interface ApiFixture {
  fixture: { id: number; status: { short: string } }
  teams: {
    home: { name: string }
    away: { name: string }
  }
  goals: { home: number | null; away: number | null }
}

export async function GET(req: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    return NextResponse.json({ skipped: true, reason: 'RAPIDAPI_KEY not set' })
  }

  const leagueId = process.env.FOOTBALL_LEAGUE_ID ?? '1'
  const season = process.env.FOOTBALL_SEASON ?? '2026'

  // Fetch live fixtures from API-Football
  let fixtures: ApiFixture[] = []
  try {
    const res = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=${season}&live=all`,
      {
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const json = await res.json()
    fixtures = json.response ?? []
  } catch (err) {
    console.error('[sync-scores] API fetch failed:', err)
    return NextResponse.json({ error: 'API fetch failed' }, { status: 502 })
  }

  if (fixtures.length === 0) {
    return NextResponse.json({ updated: 0, message: 'Aucun match live trouvé via API' })
  }

  const admin = createAdminClient()

  // Fetch our live matches from DB
  const { data: dbMatches } = await admin
    .from('matches')
    .select('id, team_a, team_b, score_a, score_b, status')
    .eq('status', 'live')

  if (!dbMatches || dbMatches.length === 0) {
    return NextResponse.json({ updated: 0, message: 'Aucun match live dans la DB' })
  }

  let updated = 0

  for (const fixture of fixtures) {
    const homeGoals = fixture.goals.home ?? 0
    const awayGoals = fixture.goals.away ?? 0
    const fixtureStatus = fixture.fixture.status.short // 1H, 2H, HT, FT, etc.

    // Trouver le match correspondant dans la DB (par nom d'équipe)
    const homeName = fixture.teams.home.name.toLowerCase()
    const awayName = fixture.teams.away.name.toLowerCase()

    const dbMatch = dbMatches.find((m) => {
      const a = m.team_a.toLowerCase()
      const b = m.team_b.toLowerCase()
      return (
        (a.includes(homeName) || homeName.includes(a)) &&
        (b.includes(awayName) || awayName.includes(b))
      )
    })

    if (!dbMatch) continue

    const scoreChanged = dbMatch.score_a !== homeGoals || dbMatch.score_b !== awayGoals
    const shouldFinish = ['FT', 'AET', 'PEN'].includes(fixtureStatus)

    if (scoreChanged || shouldFinish) {
      const fields: Record<string, unknown> = {
        score_a: homeGoals,
        score_b: awayGoals,
      }
      if (shouldFinish) {
        fields.status = 'finished'
        fields._trigger_calculate = true
      }

      const { error } = await admin
        .from('matches')
        .update({ score_a: homeGoals, score_b: awayGoals, ...(shouldFinish ? { status: 'finished' } : {}) })
        .eq('id', dbMatch.id)

      if (!error) {
        updated++
        // Déclencher le calcul des pronostics si le match est terminé
        if (shouldFinish) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          await fetch(`${baseUrl}/api/admin/calculate-match/${dbMatch.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
          }).catch(() => {})
        }
      }
    }
  }

  return NextResponse.json({ updated, fixtures: fixtures.length, timestamp: new Date().toISOString() })
}
