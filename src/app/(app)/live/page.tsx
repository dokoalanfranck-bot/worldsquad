import { createAdminClient } from '@/lib/supabase/admin'
import { LiveStreamClient } from './LiveStreamClient'

export const dynamic = 'force-dynamic'

export default async function LivePage() {
  const admin = createAdminClient()
  const { data: config } = await admin
    .from('live_config')
    .select('youtube_url, title, subtitle, is_active, stream_type, room_name, thumbnail_url, starts_at')
    .eq('id', 1)
    .single()

  return (
    <LiveStreamClient
      isActive={config?.is_active ?? false}
      youtubeUrl={config?.youtube_url ?? null}
      title={config?.title ?? 'Match en Direct'}
      subtitle={config?.subtitle ?? null}
      streamType={(config?.stream_type as 'jitsi' | 'youtube') ?? 'jitsi'}
      roomName={config?.room_name ?? null}
      thumbnailUrl={config?.thumbnail_url ?? null}
      startsAt={config?.starts_at ?? null}
    />
  )
}
