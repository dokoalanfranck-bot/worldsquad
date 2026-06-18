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
  if (!t) notFound()

  // Only participants can view this page
  const isParticipant = [t.p0_id, t.p1_id, t.p2_id, t.p3_id].includes(user.id)
  if (!isParticipant) notFound()

  // Server-side advance check: fire-and-forget so it doesn't block the render
  if (t.status === 'semi_active' || t.status === 'final_active') {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${base}/api/tournament/${id}/advance`, { method: 'POST' }).catch(() => {})
  }

  return <TournamentClient tournament={t} currentUserId={user.id} />
}
