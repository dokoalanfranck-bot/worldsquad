import { createClient } from '@/lib/supabase/server'
import { CollectionClient } from './CollectionClient'

export default async function CollectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: allCards }, { data: userCards }] = await Promise.all([
    supabase.from('cards').select('*').order('rarity', { ascending: false }).order('name'),
    supabase.from('user_cards').select('card_id').eq('user_id', user!.id),
  ])

  const ownedIds = new Set((userCards ?? []).map((uc) => uc.card_id))

  return (
    <CollectionClient
      allCards={allCards ?? []}
      ownedIds={[...ownedIds]}
    />
  )
}
