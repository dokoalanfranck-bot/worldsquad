import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { DuelClient } from './DuelClient'
import type { Card } from '@/types'

export default async function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: duel } = await admin.from('duels').select('*').eq('id', duelId).single()
  if (!duel) notFound()
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) redirect('/battles')

  const [{ data: challenger }, { data: opponent }, { data: myCardsRaw }, { data: rewardCard }] = await Promise.all([
    admin.from('users').select('id, pseudo, nation, photo_url').eq('id', duel.challenger_id).single(),
    duel.opponent_id
      ? admin.from('users').select('id, pseudo, nation, photo_url').eq('id', duel.opponent_id).single()
      : Promise.resolve({ data: null }),
    admin.from('user_cards').select('card:cards(id,name,rarity,image_url,stats,type,nation,description,created_at)').eq('user_id', user.id),
    duel.reward_card_id
      ? admin.from('cards').select('*').eq('id', duel.reward_card_id).single()
      : Promise.resolve({ data: null }),
  ])

  const myCards = (myCardsRaw ?? []).map((uc) => (uc.card as unknown) as Card).filter(Boolean) as Card[]

  const initialDuel = {
    ...duel,
    challenger,
    opponent: opponent ?? { id: null, pseudo: duel.bot_name ?? 'Bot', nation: '🤖', photo_url: null },
    reward_card: rewardCard ?? null,
  }

  return <DuelClient initialDuel={initialDuel} currentUserId={user.id} myCards={myCards} />
}
