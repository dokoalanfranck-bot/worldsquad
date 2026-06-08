import { createClient } from '@/lib/supabase/server'
import { BattlesClient } from './BattlesClient'

export default async function BattlesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: battles } = await supabase
    .from('battles')
    .select(`
      *,
      challenger:users!battles_challenger_id_fkey(id, pseudo, photo_url, nation),
      opponent:users!battles_opponent_id_fkey(id, pseudo, photo_url, nation),
      challenger_card:cards!battles_challenger_card_id_fkey(*),
      opponent_card:cards!battles_opponent_card_id_fkey(*)
    `)
    .or(`challenger_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
    .order('created_at', { ascending: false })

  return <BattlesClient battles={battles ?? []} currentUserId={user!.id} />
}
