// TheSportsDB free API wrapper — key 3
const BASE = 'https://www.thesportsdb.com/api/v1/json/3'

export interface SportsDBEvent {
  idEvent: string
  strEvent: string
  strHomeTeam: string
  strAwayTeam: string
  intHomeScore: string | null
  intAwayScore: string | null
  strStatus: string    // NS, 1H, HT, 2H, ET, PEN, FT, AET, ABD, PPD
  strTimestamp: string
  dateEvent: string
  strGroup: string | null
  strVenue: string | null
  strLeague: string
}

export interface SportsDBLineup {
  idEvent: string
  strHomeTeam: string
  strAwayTeam: string
  strPlayer: string
  strTeam: string
  strPosition: string
  intSquadNumber: string | null
  strFormation: string | null
}

// Map our team names to TheSportsDB equivalents (handle slight differences)
const TEAM_NAME_MAP: Record<string, string> = {
  'USA':          'United States',
  'South Korea':  'Korea Republic',
  'Iran':         'IR Iran',
  'Czech Republic': 'Czechia',
}

export function normalizeName(name: string): string {
  return (TEAM_NAME_MAP[name] ?? name).toLowerCase().trim()
}

export async function fetchDayEvents(date: string): Promise<SportsDBEvent[]> {
  // date format: YYYY-MM-DD
  const url = `${BASE}/eventsday.php?d=${date}&s=Soccer`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return []
  const data = await res.json()
  const events: SportsDBEvent[] = data.events ?? []
  return events.filter((e) => e.strLeague === 'FIFA World Cup')
}

export async function fetchEventById(eventId: string): Promise<SportsDBEvent | null> {
  const url = `${BASE}/eventslookup.php?id=${eventId}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return null
  const data = await res.json()
  return data.events?.[0] ?? null
}

export async function fetchLineup(eventId: string): Promise<SportsDBLineup[]> {
  const url = `${BASE}/lookuplineup.php?id=${eventId}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return []
  const data = await res.json()
  return data.lineup ?? []
}

export function matchStatus(strStatus: string): 'not_started' | 'live_1h' | 'half_time' | 'live_2h' | 'extra_time' | 'penalties' | 'finished' | 'unknown' {
  switch (strStatus) {
    case 'NS':  return 'not_started'
    case '1H':  return 'live_1h'
    case 'HT':  return 'half_time'
    case '2H':  return 'live_2h'
    case 'ET':  return 'extra_time'
    case 'PEN': return 'penalties'
    case 'FT':
    case 'AET': return 'finished'
    default:    return 'unknown'
  }
}
