import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'


export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', authUser.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    groups: Record<string, { name: string; flag?: string }[]>
    generate_matches?: boolean
    first_match_date?: string
  }

  const admin = createAdminClient()

  // Upsert teams
  const teamsToInsert: { name: string; flag: string; group_letter: string }[] = []
  for (const [groupLetter, groupTeams] of Object.entries(body.groups)) {
    for (const team of groupTeams) {
      teamsToInsert.push({
        name: team.name,
        flag: team.flag ?? 'ðŸ³',
        group_letter: groupLetter,
      })
    }
  }

  const { error: teamsError } = await admin
    .from('teams')
    .upsert(teamsToInsert, { onConflict: 'name' })

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 })
  }

  let matchesGenerated = 0

  if (body.generate_matches) {
    // Delete existing group-phase matches
    await admin.from('matches').delete().eq('phase', 'group')

    const matchesToInsert: {
      team_a: string
      team_b: string
      flag_a: string
      flag_b: string
      match_date: string
      phase: string
      group_letter: string
      status: string
    }[] = []

    const startDate = body.first_match_date
      ? new Date(body.first_match_date)
      : new Date('2026-06-11T18:00:00Z')

    let dateOffset = 0

    for (const [groupLetter, groupTeams] of Object.entries(body.groups)) {
      // Generate round-robin (each team vs each other)
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const matchDate = new Date(startDate.getTime() + dateOffset * 90 * 60 * 1000)
          matchesToInsert.push({
            team_a: groupTeams[i].name,
            team_b: groupTeams[j].name,
            flag_a: groupTeams[i].flag ?? 'ðŸ³',
            flag_b: groupTeams[j].flag ?? 'ðŸ³',
            match_date: matchDate.toISOString(),
            phase: 'group',
            group_letter: groupLetter,
            status: 'upcoming',
          })
          dateOffset++
        }
      }
    }

    const { error: matchError } = await admin.from('matches').insert(matchesToInsert)
    if (!matchError) {
      matchesGenerated = matchesToInsert.length
    }
  }

  return NextResponse.json({
    success: true,
    teamsImported: teamsToInsert.length,
    matchesGenerated,
  })
}
