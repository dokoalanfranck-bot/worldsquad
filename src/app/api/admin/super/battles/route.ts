import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_super_admin').eq('id', user.id).single()
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: duels }, { data: penalties }] = await Promise.all([
    admin.from('duels')
      .select('id, status, is_bot, created_at, challenger_id, opponent_id')
      .in('status', ['open', 'invited', 'picking', 'stealing'])
      .order('created_at', { ascending: false })
      .limit(50),
    admin.from('penalty_battles')
      .select('id, status, created_at, challenger_id, opponent_id')
      .in('status', ['invited', 'waiting', 'picking', 'active', 'stealing'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Gather all user IDs and fetch in bulk
  const allIdsSet = new Set<string>()
  ;(duels ?? []).forEach((d) => { if (d.challenger_id) allIdsSet.add(d.challenger_id); if (d.opponent_id) allIdsSet.add(d.opponent_id) })
  ;(penalties ?? []).forEach((p) => { if (p.challenger_id) allIdsSet.add(p.challenger_id); if (p.opponent_id) allIdsSet.add(p.opponent_id) })
  const allIds = Array.from(allIdsSet)

  const { data: usersData } = allIds.length > 0
    ? await admin.from('users').select('id, pseudo, nation').in('id', allIds)
    : { data: [] }

  const userMap = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))

  const enrichedDuels = (duels ?? []).map((d) => ({
    id: d.id,
    type: 'duel' as const,
    status: d.status,
    is_bot: d.is_bot,
    created_at: d.created_at,
    challenger: userMap[d.challenger_id] ?? null,
    opponent: d.is_bot ? { pseudo: '🤖 Bot', nation: '' } : (userMap[d.opponent_id] ?? null),
  }))

  const enrichedPenalties = (penalties ?? []).map((p) => ({
    id: p.id,
    type: 'penalty' as const,
    status: p.status,
    is_bot: !p.opponent_id,
    created_at: p.created_at,
    challenger: userMap[p.challenger_id] ?? null,
    opponent: p.opponent_id ? (userMap[p.opponent_id] ?? null) : { pseudo: '🤖 Bot', nation: '' },
  }))

  return NextResponse.json({
    battles: [...enrichedDuels, ...enrichedPenalties].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  })
}
