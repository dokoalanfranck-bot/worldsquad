import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { UserEditClient } from './UserEditClient'

export const dynamic = 'force-dynamic'

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const [
    { data: user },
    { data: predictions },
    { data: battles },
    { data: transactions },
    { count: cardsCount },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', params.id).single(),
    supabase
      .from('predictions')
      .select('*, match:matches(team_a, team_b, flag_a, flag_b, score_a, score_b, status)')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('battles')
      .select('*, challenger:users!battles_challenger_id_fkey(pseudo), opponent:users!battles_opponent_id_fkey(pseudo)')
      .or(`challenger_id.eq.${params.id},opponent_id.eq.${params.id}`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('user_cards').select('*', { count: 'exact', head: true }).eq('user_id', params.id),
  ])

  if (!user) notFound()

  return (
    <UserEditClient
      user={user}
      predictions={predictions ?? []}
      battles={battles ?? []}
      transactions={transactions ?? []}
      cardsCount={cardsCount ?? 0}
    />
  )
}
