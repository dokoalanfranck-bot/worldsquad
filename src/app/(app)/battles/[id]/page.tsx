import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { BattleRevealClient } from './BattleRevealClient'

export default async function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select(`
      *,
      challenger:users!battles_challenger_id_fkey(id, pseudo, nation, photo_url),
      opponent:users!battles_opponent_id_fkey(id, pseudo, nation, photo_url),
      challenger_card:cards!battles_challenger_card_id_fkey(*),
      opponent_card:cards!battles_opponent_card_id_fkey(*)
    `)
    .eq('id', battleId)
    .single()

  if (!battle) notFound()

  // Only participants can view
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) redirect('/battles')

  // team_match actif → toujours vers /play
  if (battle.type === 'team_match' && battle.phase !== 'finished') {
    redirect(`/battles/${battleId}/play`)
  }

  // Pending: redirect opponent to accept page (classic battles)
  if (battle.status === 'pending' && battle.opponent_id === user.id) {
    redirect(`/battles/${battleId}/accept`)
  }

  return (
    <BattleRevealClient
      battle={battle}
      currentUserId={user.id}
    />
  )
}
