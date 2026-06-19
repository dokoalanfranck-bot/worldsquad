import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface SuspectUser {
  id: string
  pseudo: string
  nation: string
  coins: number
  battles_played: number
  battles_won: number
  created_at: string
  winRate: number
  accountAgeDays: number
  flags: Array<{ type: string; value: number }>
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_super_admin').eq('id', user.id).single()
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: candidates } = await admin
    .from('users')
    .select('id, pseudo, nation, coins, battles_played, battles_won, created_at, is_admin, is_super_admin')
    .eq('is_admin', false)
    .eq('is_super_admin', false)
    .eq('is_banned', false)
    .order('battles_played', { ascending: false })
    .limit(500)

  const suspects: SuspectUser[] = []

  for (const u of candidates ?? []) {
    const winRate = u.battles_played > 0 ? u.battles_won / u.battles_played : 0
    const accountAgeDays = (Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const flags: Array<{ type: string; value: number }> = []

    if (winRate > 0.92 && u.battles_played >= 25)
      flags.push({ type: 'win_rate_92', value: Math.round(winRate * 100) })
    if (u.coins > 300000)
      flags.push({ type: 'coins_300k', value: u.coins })
    if (accountAgeDays < 3 && u.battles_played > 50)
      flags.push({ type: 'rapid_farming', value: u.battles_played })
    if (u.battles_played > 500 && accountAgeDays < 30)
      flags.push({ type: 'volume_farming', value: u.battles_played })

    if (flags.length > 0)
      suspects.push({ ...u, winRate, accountAgeDays: Math.floor(accountAgeDays), flags })
  }

  suspects.sort((a, b) => b.flags.length - a.flags.length || b.battles_played - a.battles_played)

  return NextResponse.json({ suspects: suspects.slice(0, 50) })
}
