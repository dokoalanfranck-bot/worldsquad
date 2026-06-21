import { createAdminClient } from '@/lib/supabase/admin'
import { HighlightsClient } from './HighlightsClient'

export const dynamic = 'force-dynamic'

export default async function HighlightsPage() {
  const admin = createAdminClient()
  const { data: highlights } = await admin
    .from('highlights')
    .select('id, title, youtube_id, created_at')
    .order('created_at', { ascending: false })

  return <HighlightsClient highlights={highlights ?? []} />
}
