import { createAdminClient } from '@/lib/supabase/admin'
import { CardsClient } from './CardsClient'
import { TeamsGridClient } from './TeamsGridClient'
import { WC2026_SQUADS } from '@/data/wc2026-squads'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

interface SearchParams {
  rarity?: string
  search?: string
  page?: string
  team?: string
}

export default async function AdminCardsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createAdminClient()

  // ─── Niveau 1 : Grille des équipes ────────────────────────────────
  if (!searchParams.team) {
    const { data: nationRows } = await supabase
      .from('cards')
      .select('nation')
      .eq('type', 'player')
      .not('nation', 'is', null)

    const teamCounts = (nationRows ?? []).reduce<Record<string, number>>((acc, row) => {
      if (row.nation) acc[row.nation] = (acc[row.nation] ?? 0) + 1
      return acc
    }, {})

    // WC2026_SQUADS comme source de vérité : toujours 48 équipes, même si le seed n'a pas encore tourné
    const teams = WC2026_SQUADS
      .map((squad) => ({ name: squad.team, playerCount: teamCounts[squad.team] ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return <TeamsGridClient teams={teams} />
  }

  // ─── Niveau 2 : Joueurs & coach d'une équipe ─────────────────────
  const team = decodeURIComponent(searchParams.team)
  const page = Math.max(1, parseInt(searchParams.page ?? '1') || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('cards')
    .select('*', { count: 'exact' })
    .eq('type', 'player')
    .eq('nation', team)
    .order('name')

  if (searchParams.rarity && searchParams.rarity !== 'all') query = query.eq('rarity', searchParams.rarity)
  if (searchParams.search) query = query.ilike('name', `%${searchParams.search}%`)

  const { data: cards, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const cardIds = cards?.map((c) => c.id) ?? []
  let ownerCounts: Record<string, number> = {}

  if (cardIds.length > 0) {
    const { data: ownersData } = await supabase
      .from('user_cards')
      .select('card_id')
      .in('card_id', cardIds)

    ownerCounts = (ownersData ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.card_id] = (acc[row.card_id] ?? 0) + 1
      return acc
    }, {})
  }

  return (
    <CardsClient
      cards={cards ?? []}
      ownerCounts={ownerCounts}
      totalCount={count ?? 0}
      currentPage={page}
      totalPages={totalPages}
      currentType="player"
      currentRarity={searchParams.rarity ?? 'all'}
      currentSearch={searchParams.search ?? ''}
      team={team}
    />
  )
}
