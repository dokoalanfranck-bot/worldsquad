import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { BattlesHub } from './BattlesHub'
import { botNation } from '@/lib/duel-engine'

export const dynamic = 'force-dynamic'

export default async function BattlesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: duels }, { data: penaltyBattles }] = await Promise.all([
    admin
      .from('duels')
      .select('*')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(30),
    admin
      .from('penalty_battles')
      .select('*')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in('status', ['waiting', 'picking', 'active', 'stealing', 'finished'])
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // Enrich duels with profiles
  const enriched = await Promise.all((duels ?? []).map(async (d) => {
    const [{ data: challenger }, { data: opponent }] = await Promise.all([
      admin.from('users').select('id, pseudo, nation, photo_url').eq('id', d.challenger_id).single(),
      d.opponent_id
        ? admin.from('users').select('id, pseudo, nation, photo_url').eq('id', d.opponent_id).single()
        : Promise.resolve({ data: null }),
    ])
    return {
      ...d,
      challenger: challenger ?? { id: d.challenger_id, pseudo: '?', nation: '', photo_url: null },
      opponent:   opponent   ?? { id: null, pseudo: d.bot_name ?? 'Bot', nation: botNation(d.bot_name ?? 'x'), photo_url: null },
    }
  }))

  // Enrich penalty battles with profiles
  const enrichedPenalty = await Promise.all((penaltyBattles ?? []).map(async (pb) => {
    const playerIds = [pb.challenger_id, pb.opponent_id].filter(Boolean)
    const { data: profiles } = await admin
      .from('users')
      .select('id, pseudo, nation, photo_url')
      .in('id', playerIds)
    const map = new Map((profiles ?? []).map((p) => [p.id, p]))
    return {
      ...pb,
      challenger: map.get(pb.challenger_id) ?? { id: pb.challenger_id, pseudo: '?', nation: '', photo_url: null },
      opponent: pb.opponent_id ? (map.get(pb.opponent_id) ?? { id: pb.opponent_id, pseudo: '?', nation: '', photo_url: null }) : null,
    }
  }))

  const { data: profile } = await admin
    .from('users')
    .select('id, pseudo, nation, photo_url')
    .eq('id', user.id)
    .single()

  return (
    <BattlesHub
      duels={enriched}
      currentUserId={user.id}
      penaltyBattles={enrichedPenalty}
      currentUser={profile ?? { id: user.id, pseudo: '?', nation: '', photo_url: null }}
    />
  )
}
