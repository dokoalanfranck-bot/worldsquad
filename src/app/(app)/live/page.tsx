import { createAdminClient } from '@/lib/supabase/admin'
import { LiveStreamClient } from './LiveStreamClient'

export const dynamic = 'force-dynamic'

export default async function LivePage() {
  const admin = createAdminClient()
  const { data: config } = await admin
    .from('live_config')
    .select('youtube_url, title, subtitle, is_active, updated_by, updated_at')
    .eq('id', 1)
    .single()

  return (
    <LiveStreamClient
      isActive={config?.is_active ?? false}
      youtubeUrl={config?.youtube_url ?? null}
      title={config?.title ?? 'Match en Direct'}
      subtitle={config?.subtitle ?? null}
    />
  )
}
