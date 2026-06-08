import { createClient } from '@/lib/supabase/server'
import { CollectionClient } from './CollectionClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 48

interface SearchParams {
  page?: string
  type?: string
  rarity?: string
}

export default async function CollectionPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const page = Math.max(1, parseInt(searchParams.page ?? '1') || 1)
  const type = searchParams.type ?? 'all'
  const rarity = searchParams.rarity ?? 'all'
  const offset = (page - 1) * PAGE_SIZE

  // Tous les IDs possédés (léger : juste les IDs)
  const { data: userCards } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user!.id)

  const ownedIds = (userCards ?? []).map((uc) => uc.card_id)

  // Cartes possédées — toutes d'un coup (rarement > 200)
  let ownedQuery = supabase
    .from('cards')
    .select('*')
    .in('id', ownedIds.length > 0 ? ownedIds : ['00000000-0000-0000-0000-000000000000'])
    .order('rarity', { ascending: false })
    .order('name')

  if (type !== 'all') ownedQuery = ownedQuery.eq('type', type)
  if (rarity !== 'all') ownedQuery = ownedQuery.eq('rarity', rarity)

  // Cartes non possédées — paginées
  let notOwnedQuery = supabase
    .from('cards')
    .select('*', { count: 'exact' })
    .not('id', 'in', `(${ownedIds.length > 0 ? ownedIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
    .order('rarity', { ascending: false })
    .order('name')
    .range(offset, offset + PAGE_SIZE - 1)

  if (type !== 'all') notOwnedQuery = notOwnedQuery.eq('type', type)
  if (rarity !== 'all') notOwnedQuery = notOwnedQuery.eq('rarity', rarity)

  // Total de toutes les cartes (pour le compteur global)
  let totalQuery = supabase.from('cards').select('*', { count: 'exact', head: true })
  if (type !== 'all') totalQuery = totalQuery.eq('type', type)
  if (rarity !== 'all') totalQuery = totalQuery.eq('rarity', rarity)

  const [
    { data: ownedCards },
    { data: notOwnedCards, count: notOwnedCount },
    { count: totalCount },
  ] = await Promise.all([ownedQuery, notOwnedQuery, totalQuery])

  const totalPages = Math.ceil((notOwnedCount ?? 0) / PAGE_SIZE)

  return (
    <CollectionClient
      ownedCards={ownedCards ?? []}
      notOwnedCards={notOwnedCards ?? []}
      ownedIds={ownedIds}
      totalCards={totalCount ?? 0}
      currentPage={page}
      totalPages={totalPages}
      notOwnedCount={notOwnedCount ?? 0}
      currentType={type}
      currentRarity={rarity}
    />
  )
}
