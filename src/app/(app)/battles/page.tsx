import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { BattlesHub } from './BattlesHub'
import { botNation } from '@/lib/duel-engine'
import type { Card } from '@/types'

export default async function BattlesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: duels } = await admin
    .from('duels')
    .select(`
      id, status, is_bot, bot_name,
      challenger_score, opponent_score, winner_id,
      reward_card_id, coins_stake, created_at,
      challenger_id, opponent_id
    `)
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(20)

  // Enrich with profiles + reward cards
  const enriched = await Promise.all((duels ?? []).map(async (d) => {
    const [{ data: challenger }, { data: opponent }, { data: rewardCard }] = await Promise.all([
      admin.from('users').select('id, pseudo, nation, photo_url').eq('id', d.challenger_id).single(),
      d.opponent_id
        ? admin.from('users').select('id, pseudo, nation, photo_url').eq('id', d.opponent_id).single()
        : Promise.resolve({ data: null }),
      d.reward_card_id
        ? admin.from('cards').select('id, name, rarity, image_url').eq('id', d.reward_card_id).single()
        : Promise.resolve({ data: null }),
    ])
    return {
      ...d,
      challenger: challenger ?? { id: d.challenger_id, pseudo: '?', nation: '', photo_url: null },
      opponent: opponent ?? { id: null, pseudo: d.bot_name ?? 'Joueur', nation: botNation(d.bot_name ?? 'x'), photo_url: null },
      reward_card: rewardCard,
    }
  }))

  return <BattlesHub duels={enriched} currentUserId={user.id} />
}
