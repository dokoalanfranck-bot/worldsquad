import { createClient } from '@/lib/supabase/server'
import { CollectionClient } from './CollectionClient'
import { PaniniClient } from './PaniniClient'
import type { Card } from '@/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 48

const FLAG_MAP: Record<string, string> = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czech Republic': '🇨🇿',
  'Canada': '🇨🇦', 'Bosnia & Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷', 'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turkey': '🇹🇷',
  'Germany': '🇩🇪', 'Curaçao': '🇨🇼', 'Ivory Coast': '🇨🇮', 'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Sweden': '🇸🇪', 'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
  'Spain': '🇪🇸', 'Cape Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾',
  'France': '🇫🇷', 'Senegal': '🇸🇳', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Argentina': '🇦🇷', 'Algeria': '🇩🇿', 'Austria': '🇦🇹', 'Jordan': '🇯🇴',
  'Portugal': '🇵🇹', 'DR Congo': '🇨🇩', 'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Ghana': '🇬🇭', 'Panama': '🇵🇦',
}

interface SearchParams {
  page?: string
  type?: string
  rarity?: string
  view?: string
}

export default async function CollectionPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const view = params.view ?? 'grid'

  // Fetch owned IDs (always needed)
  const { data: userCards } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user!.id)

  const ownedIds = (userCards ?? []).map((uc) => uc.card_id)
  const ownedSet = new Set(ownedIds)

  // ── PANINI VIEW ──────────────────────────────────────────
  if (view === 'panini') {
    const { data: allPlayerCards, count: totalCount } = await supabase
      .from('cards')
      .select('*', { count: 'exact' })
      .eq('type', 'player')
      .order('nation')
      .order('name')
      .limit(2000)

    // Group by nation
    const groups: Record<string, Card[]> = {}
    for (const card of allPlayerCards ?? []) {
      const nation = (card as Card).nation ?? 'Inconnue'
      if (!groups[nation]) groups[nation] = []
      groups[nation].push(card as Card)
    }

    const nationGroups = Object.entries(groups)
      .map(([nation, cards]) => ({
        nation,
        flag: FLAG_MAP[nation] ?? '🏳',
        cards,
        ownedCount: cards.filter((c) => ownedSet.has(c.id)).length,
      }))
      .sort((a, b) => a.nation.localeCompare(b.nation))

    return (
      <PaniniClient
        nationGroups={nationGroups}
        ownedIds={ownedIds}
        totalCards={totalCount ?? 0}
      />
    )
  }

  // ── GRID VIEW ────────────────────────────────────────────
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const type = params.type ?? 'all'
  const rarity = params.rarity ?? 'all'
  const offset = (page - 1) * PAGE_SIZE

  let ownedQuery = supabase
    .from('cards')
    .select('*')
    .in('id', ownedIds.length > 0 ? ownedIds : ['00000000-0000-0000-0000-000000000000'])
    .order('rarity', { ascending: false })
    .order('name')

  if (type !== 'all') ownedQuery = ownedQuery.eq('type', type)
  if (rarity !== 'all') ownedQuery = ownedQuery.eq('rarity', rarity)

  let notOwnedQuery = supabase
    .from('cards')
    .select('*', { count: 'exact' })
    .not('id', 'in', `(${ownedIds.length > 0 ? ownedIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
    .order('rarity', { ascending: false })
    .order('name')
    .range(offset, offset + PAGE_SIZE - 1)

  if (type !== 'all') notOwnedQuery = notOwnedQuery.eq('type', type)
  if (rarity !== 'all') notOwnedQuery = notOwnedQuery.eq('rarity', rarity)

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
