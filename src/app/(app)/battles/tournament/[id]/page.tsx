import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { TournamentClient } from './TournamentClient'

export const dynamic = 'force-dynamic'

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: t } = await admin.from('tournaments').select('*').eq('id', id).single()
  if (!t || t.p0_id !== user.id) notFound()

  return <TournamentClient tournament={t} currentUserId={user.id} />
}
