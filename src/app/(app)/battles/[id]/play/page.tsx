import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { PlayClient } from './PlayClient'

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select(`
      *,
      challenger:users!battles_challenger_id_fkey(id, pseudo, nation, photo_url, coins),
      opponent:users!battles_opponent_id_fkey(id, pseudo, nation, photo_url, coins)
    `)
    .eq('id', battleId)
    .single()

  if (!battle) notFound()
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) redirect('/battles')

  // Get current user's cards for draft phase
  const { data: myCardsRaw } = await admin
    .from('user_cards')
    .select('card:cards(id, name, rarity, image_url, stats, type, nation)')
    .eq('user_id', user.id)

  const myCards = (myCardsRaw ?? []).map((uc) => uc.card).filter(Boolean)

  return (
    <PlayClient
      initialBattle={battle}
      currentUserId={user.id}
      myCards={myCards as never}
    />
  )
}
