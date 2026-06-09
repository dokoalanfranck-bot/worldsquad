import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { AcceptBattleClient } from './AcceptBattleClient'

export default async function AcceptBattlePage({ params }: { params: Promise<{ id: string }> }) {
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
      challenger_card:cards!battles_challenger_card_id_fkey(*)
    `)
    .eq('id', battleId)
    .single()

  if (!battle) notFound()

  // Only the opponent can access this page
  if (battle.opponent_id !== user.id) redirect('/battles')
  if (battle.status !== 'pending') redirect(`/battles/${battleId}`)

  // Get opponent's cards
  const { data: userCards } = await admin
    .from('user_cards')
    .select('card:cards(*)')
    .eq('user_id', user.id)

  const myCards = (userCards ?? []).map((uc) => uc.card).filter(Boolean)

  return (
    <AcceptBattleClient
      battle={battle}
      myCards={myCards as never}
    />
  )
}
