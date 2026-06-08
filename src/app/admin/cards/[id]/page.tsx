import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { CardFormClient } from '../CardFormClient'

export const dynamic = 'force-dynamic'

export default async function AdminCardEditPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const [{ data: card }, { count: ownersCount }] = await Promise.all([
    supabase.from('cards').select('*').eq('id', params.id).single(),
    supabase.from('user_cards').select('*', { count: 'exact', head: true }).eq('card_id', params.id),
  ])

  if (!card) notFound()

  return <CardFormClient card={card} ownersCount={ownersCount ?? 0} />
}
