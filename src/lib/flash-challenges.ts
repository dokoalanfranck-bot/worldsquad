import { createAdminClient } from './supabase/admin'

export interface FlashChallenge {
  id: string
  match_id: string
  label: string
  bonus_coins: number
  starts_at: string
  ends_at: string
  created_at: string
  match?: {
    team_a: string
    team_b: string
    flag_a: string | null
    flag_b: string | null
    match_date: string
    status: string
  }
}

export async function getActiveFlashChallenges(): Promise<FlashChallenge[]> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data } = await admin
    .from('flash_challenges')
    .select('*, match:matches(team_a, team_b, flag_a, flag_b, match_date, status)')
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('ends_at', { ascending: true })
  return (data ?? []) as FlashChallenge[]
}

export async function getFlashChallengeForMatch(matchId: string): Promise<FlashChallenge | null> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data } = await admin
    .from('flash_challenges')
    .select('*')
    .eq('match_id', matchId)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('ends_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data as FlashChallenge | null
}
