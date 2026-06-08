import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// ─── FLAGS ────────────────────────────────────────────────────────────────────
const FLAGS: Record<string, string> = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czech Republic': '🇨🇿',
  'Canada': '🇨🇦', 'Bosnia & Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷', 'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turkey': '🇹🇷',
  'Germany': '🇩🇪', 'Curaçao': '🇨🇼', 'Ivory Coast': '🇨🇮', 'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Sweden': '🇸🇪', 'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
  'Spain': '🇪🇸', 'Cape Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾',
  'France': '🇫🇷', 'Senegal': '🇸🇳', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Argentina': '🇦🇷', 'Algeria': '🇩🇿', 'Austria': '🇦🇹', 'Jordan': '🇯🇴',
  'Portugal': '🇵🇹', 'DR Congo': '🇨🇩', 'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Ghana': '🇬🇭', 'Panama': '🇵🇦',
}

// ─── TEAMS BY GROUP ───────────────────────────────────────────────────────────
const GROUPS: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
  B: ['Canada', 'Bosnia & Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['USA', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
}

// ─── GROUP STAGE MATCHES (UTC times) ─────────────────────────────────────────
const GROUP_MATCHES = [
  // GROUP A
  { a: 'Mexico', b: 'South Africa', date: '2026-06-11T19:00:00Z', group: 'A', venue: 'Mexico City' },
  { a: 'South Korea', b: 'Czech Republic', date: '2026-06-12T02:00:00Z', group: 'A', venue: 'Guadalajara' },
  { a: 'Czech Republic', b: 'South Africa', date: '2026-06-18T16:00:00Z', group: 'A', venue: 'Atlanta' },
  { a: 'Mexico', b: 'South Korea', date: '2026-06-19T01:00:00Z', group: 'A', venue: 'Guadalajara' },
  { a: 'Czech Republic', b: 'Mexico', date: '2026-06-25T01:00:00Z', group: 'A', venue: 'Mexico City' },
  { a: 'South Africa', b: 'South Korea', date: '2026-06-25T01:00:00Z', group: 'A', venue: 'Monterrey' },
  // GROUP B
  { a: 'Canada', b: 'Bosnia & Herzegovina', date: '2026-06-12T19:00:00Z', group: 'B', venue: 'Toronto' },
  { a: 'Qatar', b: 'Switzerland', date: '2026-06-13T19:00:00Z', group: 'B', venue: 'San Francisco' },
  { a: 'Switzerland', b: 'Bosnia & Herzegovina', date: '2026-06-18T19:00:00Z', group: 'B', venue: 'Los Angeles' },
  { a: 'Canada', b: 'Qatar', date: '2026-06-18T22:00:00Z', group: 'B', venue: 'Vancouver' },
  { a: 'Switzerland', b: 'Canada', date: '2026-06-24T19:00:00Z', group: 'B', venue: 'Vancouver' },
  { a: 'Bosnia & Herzegovina', b: 'Qatar', date: '2026-06-24T19:00:00Z', group: 'B', venue: 'Seattle' },
  // GROUP C
  { a: 'Brazil', b: 'Morocco', date: '2026-06-13T22:00:00Z', group: 'C', venue: 'New York/New Jersey' },
  { a: 'Haiti', b: 'Scotland', date: '2026-06-14T01:00:00Z', group: 'C', venue: 'Boston' },
  { a: 'Scotland', b: 'Morocco', date: '2026-06-19T22:00:00Z', group: 'C', venue: 'Boston' },
  { a: 'Brazil', b: 'Haiti', date: '2026-06-20T00:30:00Z', group: 'C', venue: 'Philadelphia' },
  { a: 'Scotland', b: 'Brazil', date: '2026-06-24T22:00:00Z', group: 'C', venue: 'Miami' },
  { a: 'Morocco', b: 'Haiti', date: '2026-06-24T22:00:00Z', group: 'C', venue: 'Atlanta' },
  // GROUP D
  { a: 'USA', b: 'Paraguay', date: '2026-06-13T01:00:00Z', group: 'D', venue: 'Los Angeles' },
  { a: 'Australia', b: 'Turkey', date: '2026-06-14T04:00:00Z', group: 'D', venue: 'Vancouver' },
  { a: 'USA', b: 'Australia', date: '2026-06-19T19:00:00Z', group: 'D', venue: 'Seattle' },
  { a: 'Turkey', b: 'Paraguay', date: '2026-06-20T03:00:00Z', group: 'D', venue: 'San Francisco' },
  { a: 'Turkey', b: 'USA', date: '2026-06-26T02:00:00Z', group: 'D', venue: 'Los Angeles' },
  { a: 'Paraguay', b: 'Australia', date: '2026-06-26T02:00:00Z', group: 'D', venue: 'San Francisco' },
  // GROUP E
  { a: 'Germany', b: 'Curaçao', date: '2026-06-14T17:00:00Z', group: 'E', venue: 'Houston' },
  { a: 'Ivory Coast', b: 'Ecuador', date: '2026-06-14T23:00:00Z', group: 'E', venue: 'Philadelphia' },
  { a: 'Germany', b: 'Ivory Coast', date: '2026-06-20T20:00:00Z', group: 'E', venue: 'Toronto' },
  { a: 'Ecuador', b: 'Curaçao', date: '2026-06-21T00:00:00Z', group: 'E', venue: 'Kansas City' },
  { a: 'Curaçao', b: 'Ivory Coast', date: '2026-06-25T20:00:00Z', group: 'E', venue: 'Philadelphia' },
  { a: 'Ecuador', b: 'Germany', date: '2026-06-25T20:00:00Z', group: 'E', venue: 'New York/New Jersey' },
  // GROUP F
  { a: 'Netherlands', b: 'Japan', date: '2026-06-14T20:00:00Z', group: 'F', venue: 'Dallas' },
  { a: 'Sweden', b: 'Tunisia', date: '2026-06-15T02:00:00Z', group: 'F', venue: 'Monterrey' },
  { a: 'Netherlands', b: 'Sweden', date: '2026-06-20T17:00:00Z', group: 'F', venue: 'Houston' },
  { a: 'Tunisia', b: 'Japan', date: '2026-06-21T04:00:00Z', group: 'F', venue: 'Monterrey' },
  { a: 'Japan', b: 'Sweden', date: '2026-06-25T23:00:00Z', group: 'F', venue: 'Dallas' },
  { a: 'Tunisia', b: 'Netherlands', date: '2026-06-25T23:00:00Z', group: 'F', venue: 'Kansas City' },
  // GROUP G
  { a: 'Belgium', b: 'Egypt', date: '2026-06-15T19:00:00Z', group: 'G', venue: 'Seattle' },
  { a: 'Iran', b: 'New Zealand', date: '2026-06-16T01:00:00Z', group: 'G', venue: 'Los Angeles' },
  { a: 'Belgium', b: 'Iran', date: '2026-06-21T19:00:00Z', group: 'G', venue: 'Los Angeles' },
  { a: 'New Zealand', b: 'Egypt', date: '2026-06-22T01:00:00Z', group: 'G', venue: 'Vancouver' },
  { a: 'Egypt', b: 'Iran', date: '2026-06-27T03:00:00Z', group: 'G', venue: 'Seattle' },
  { a: 'New Zealand', b: 'Belgium', date: '2026-06-27T03:00:00Z', group: 'G', venue: 'Vancouver' },
  // GROUP H
  { a: 'Spain', b: 'Cape Verde', date: '2026-06-15T16:00:00Z', group: 'H', venue: 'Atlanta' },
  { a: 'Saudi Arabia', b: 'Uruguay', date: '2026-06-15T22:00:00Z', group: 'H', venue: 'Miami' },
  { a: 'Spain', b: 'Saudi Arabia', date: '2026-06-21T16:00:00Z', group: 'H', venue: 'Atlanta' },
  { a: 'Uruguay', b: 'Cape Verde', date: '2026-06-21T22:00:00Z', group: 'H', venue: 'Miami' },
  { a: 'Cape Verde', b: 'Saudi Arabia', date: '2026-06-27T00:00:00Z', group: 'H', venue: 'Houston' },
  { a: 'Uruguay', b: 'Spain', date: '2026-06-27T00:00:00Z', group: 'H', venue: 'Guadalajara' },
  // GROUP I
  { a: 'France', b: 'Senegal', date: '2026-06-16T19:00:00Z', group: 'I', venue: 'New York/New Jersey' },
  { a: 'Iraq', b: 'Norway', date: '2026-06-16T22:00:00Z', group: 'I', venue: 'Boston' },
  { a: 'France', b: 'Iraq', date: '2026-06-22T21:00:00Z', group: 'I', venue: 'Philadelphia' },
  { a: 'Norway', b: 'Senegal', date: '2026-06-23T00:00:00Z', group: 'I', venue: 'New York/New Jersey' },
  { a: 'Norway', b: 'France', date: '2026-06-26T19:00:00Z', group: 'I', venue: 'Boston' },
  { a: 'Senegal', b: 'Iraq', date: '2026-06-26T19:00:00Z', group: 'I', venue: 'Toronto' },
  // GROUP J
  { a: 'Argentina', b: 'Algeria', date: '2026-06-17T01:00:00Z', group: 'J', venue: 'Kansas City' },
  { a: 'Austria', b: 'Jordan', date: '2026-06-17T04:00:00Z', group: 'J', venue: 'San Francisco' },
  { a: 'Argentina', b: 'Austria', date: '2026-06-22T17:00:00Z', group: 'J', venue: 'Dallas' },
  { a: 'Jordan', b: 'Algeria', date: '2026-06-23T03:00:00Z', group: 'J', venue: 'San Francisco' },
  { a: 'Algeria', b: 'Austria', date: '2026-06-28T02:00:00Z', group: 'J', venue: 'Kansas City' },
  { a: 'Jordan', b: 'Argentina', date: '2026-06-28T02:00:00Z', group: 'J', venue: 'Dallas' },
  // GROUP K
  { a: 'Portugal', b: 'DR Congo', date: '2026-06-17T17:00:00Z', group: 'K', venue: 'Houston' },
  { a: 'Uzbekistan', b: 'Colombia', date: '2026-06-18T02:00:00Z', group: 'K', venue: 'Mexico City' },
  { a: 'Portugal', b: 'Uzbekistan', date: '2026-06-23T17:00:00Z', group: 'K', venue: 'Houston' },
  { a: 'Colombia', b: 'DR Congo', date: '2026-06-24T02:00:00Z', group: 'K', venue: 'Guadalajara' },
  { a: 'Colombia', b: 'Portugal', date: '2026-06-27T23:30:00Z', group: 'K', venue: 'Miami' },
  { a: 'DR Congo', b: 'Uzbekistan', date: '2026-06-27T23:30:00Z', group: 'K', venue: 'Atlanta' },
  // GROUP L
  { a: 'England', b: 'Croatia', date: '2026-06-17T20:00:00Z', group: 'L', venue: 'Dallas' },
  { a: 'Ghana', b: 'Panama', date: '2026-06-17T23:00:00Z', group: 'L', venue: 'Toronto' },
  { a: 'England', b: 'Ghana', date: '2026-06-23T20:00:00Z', group: 'L', venue: 'Boston' },
  { a: 'Panama', b: 'Croatia', date: '2026-06-23T23:00:00Z', group: 'L', venue: 'Toronto' },
  { a: 'Panama', b: 'England', date: '2026-06-27T21:00:00Z', group: 'L', venue: 'New York/New Jersey' },
  { a: 'Croatia', b: 'Ghana', date: '2026-06-27T21:00:00Z', group: 'L', venue: 'Philadelphia' },
]

// ─── KNOCKOUT MATCHES (TBD teams) ────────────────────────────────────────────
const KNOCKOUT_MATCHES = [
  // Round of 32 (June 28 – July 3)
  { a: 'TBD', b: 'TBD', date: '2026-06-28T19:00:00Z', phase: 'round16', venue: 'Los Angeles', label: 'Round of 32 · M73' },
  { a: 'TBD', b: 'TBD', date: '2026-06-29T20:30:00Z', phase: 'round16', venue: 'Boston', label: 'Round of 32 · M74' },
  { a: 'TBD', b: 'TBD', date: '2026-06-29T01:00:00Z', phase: 'round16', venue: 'Monterrey', label: 'Round of 32 · M75' },
  { a: 'TBD', b: 'TBD', date: '2026-06-29T17:00:00Z', phase: 'round16', venue: 'Houston', label: 'Round of 32 · M76' },
  { a: 'TBD', b: 'TBD', date: '2026-06-30T21:00:00Z', phase: 'round16', venue: 'New York/New Jersey', label: 'Round of 32 · M77' },
  { a: 'TBD', b: 'TBD', date: '2026-06-30T17:00:00Z', phase: 'round16', venue: 'Dallas', label: 'Round of 32 · M78' },
  { a: 'TBD', b: 'TBD', date: '2026-06-30T01:00:00Z', phase: 'round16', venue: 'Mexico City', label: 'Round of 32 · M79' },
  { a: 'TBD', b: 'TBD', date: '2026-07-01T16:00:00Z', phase: 'round16', venue: 'Atlanta', label: 'Round of 32 · M80' },
  { a: 'TBD', b: 'TBD', date: '2026-07-01T00:00:00Z', phase: 'round16', venue: 'San Francisco', label: 'Round of 32 · M81' },
  { a: 'TBD', b: 'TBD', date: '2026-07-01T20:00:00Z', phase: 'round16', venue: 'Seattle', label: 'Round of 32 · M82' },
  { a: 'TBD', b: 'TBD', date: '2026-07-02T23:00:00Z', phase: 'round16', venue: 'Toronto', label: 'Round of 32 · M83' },
  { a: 'TBD', b: 'TBD', date: '2026-07-02T19:00:00Z', phase: 'round16', venue: 'Los Angeles', label: 'Round of 32 · M84' },
  { a: 'TBD', b: 'TBD', date: '2026-07-03T03:00:00Z', phase: 'round16', venue: 'Vancouver', label: 'Round of 32 · M85' },
  { a: 'TBD', b: 'TBD', date: '2026-07-03T22:00:00Z', phase: 'round16', venue: 'Miami', label: 'Round of 32 · M86' },
  { a: 'TBD', b: 'TBD', date: '2026-07-04T01:30:00Z', phase: 'round16', venue: 'Kansas City', label: 'Round of 32 · M87' },
  { a: 'TBD', b: 'TBD', date: '2026-07-03T18:00:00Z', phase: 'round16', venue: 'Dallas', label: 'Round of 32 · M88' },
  // Round of 16 (July 4–7)
  { a: 'TBD', b: 'TBD', date: '2026-07-04T21:00:00Z', phase: 'round16', venue: 'Philadelphia', label: 'Round of 16 · M89' },
  { a: 'TBD', b: 'TBD', date: '2026-07-04T17:00:00Z', phase: 'round16', venue: 'Houston', label: 'Round of 16 · M90' },
  { a: 'TBD', b: 'TBD', date: '2026-07-05T20:00:00Z', phase: 'round16', venue: 'New York/New Jersey', label: 'Round of 16 · M91' },
  { a: 'TBD', b: 'TBD', date: '2026-07-06T00:00:00Z', phase: 'round16', venue: 'Mexico City', label: 'Round of 16 · M92' },
  { a: 'TBD', b: 'TBD', date: '2026-07-06T19:00:00Z', phase: 'round16', venue: 'Dallas', label: 'Round of 16 · M93' },
  { a: 'TBD', b: 'TBD', date: '2026-07-07T00:00:00Z', phase: 'round16', venue: 'Seattle', label: 'Round of 16 · M94' },
  { a: 'TBD', b: 'TBD', date: '2026-07-07T16:00:00Z', phase: 'round16', venue: 'Atlanta', label: 'Round of 16 · M95' },
  { a: 'TBD', b: 'TBD', date: '2026-07-07T20:00:00Z', phase: 'round16', venue: 'Vancouver', label: 'Round of 16 · M96' },
  // Quarter-finals (July 9–11)
  { a: 'TBD', b: 'TBD', date: '2026-07-09T20:00:00Z', phase: 'quarter', venue: 'Boston', label: 'Quart de finale · M97' },
  { a: 'TBD', b: 'TBD', date: '2026-07-10T19:00:00Z', phase: 'quarter', venue: 'Los Angeles', label: 'Quart de finale · M98' },
  { a: 'TBD', b: 'TBD', date: '2026-07-11T21:00:00Z', phase: 'quarter', venue: 'Miami', label: 'Quart de finale · M99' },
  { a: 'TBD', b: 'TBD', date: '2026-07-12T01:00:00Z', phase: 'quarter', venue: 'Kansas City', label: 'Quart de finale · M100' },
  // Semi-finals (July 14–15)
  { a: 'TBD', b: 'TBD', date: '2026-07-14T19:00:00Z', phase: 'semi', venue: 'Dallas', label: 'Demi-finale · M101' },
  { a: 'TBD', b: 'TBD', date: '2026-07-15T19:00:00Z', phase: 'semi', venue: 'Atlanta', label: 'Demi-finale · M102' },
  // Third place + Final
  { a: 'TBD', b: 'TBD', date: '2026-07-18T21:00:00Z', phase: 'semi', venue: 'Miami', label: 'Match 3e place' },
  { a: 'TBD', b: 'TBD', date: '2026-07-19T19:00:00Z', phase: 'final', venue: 'New York/New Jersey', label: 'FINALE' },
]

export async function POST() {
  // Auth check
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', authUser.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // 1. Upsert all 48 teams
  const teamsToInsert = Object.entries(GROUPS).flatMap(([groupLetter, teams]) =>
    teams.map((name) => ({ name, flag: FLAGS[name] ?? '🏳', group_letter: groupLetter }))
  )
  const { error: teamsError } = await admin.from('teams').upsert(teamsToInsert, { onConflict: 'name' })
  if (teamsError) return NextResponse.json({ error: `Teams: ${teamsError.message}` }, { status: 500 })

  // 2. Delete existing matches to avoid duplicates
  await admin.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // 3. Insert group stage matches
  const groupMatches = GROUP_MATCHES.map((m) => ({
    team_a: m.a,
    team_b: m.b,
    flag_a: FLAGS[m.a] ?? '🏳',
    flag_b: FLAGS[m.b] ?? '🏳',
    match_date: m.date,
    phase: 'group' as const,
    group_letter: m.group,
    group_name: m.group,
    venue: m.venue,
    status: new Date(m.date) < new Date() ? 'finished' : 'upcoming',
  }))

  const { error: groupMatchError } = await admin.from('matches').insert(groupMatches)
  if (groupMatchError) return NextResponse.json({ error: `Matches: ${groupMatchError.message}` }, { status: 500 })

  // 4. Insert knockout matches
  const knockoutMatches = KNOCKOUT_MATCHES.map((m) => ({
    team_a: m.a,
    team_b: m.b,
    flag_a: '🏳',
    flag_b: '🏳',
    match_date: m.date,
    phase: m.phase as 'round16' | 'quarter' | 'semi' | 'final',
    group_name: m.label,
    venue: m.venue,
    status: 'upcoming' as const,
  }))
  await admin.from('matches').insert(knockoutMatches)

  revalidatePath('/admin')
  revalidatePath('/admin/teams')
  revalidatePath('/admin/matches')
  revalidatePath('/admin/groups')
  revalidatePath('/(app)/matches')

  return NextResponse.json({
    ok: true,
    teamsInserted: teamsToInsert.length,
    groupMatchesInserted: groupMatches.length,
    knockoutMatchesInserted: knockoutMatches.length,
    total: groupMatches.length + knockoutMatches.length,
  })
}
