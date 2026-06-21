import { createAdminClient } from '@/lib/supabase/admin'
import { HighlightsClient } from './HighlightsClient'

export const dynamic = 'force-dynamic'

function extractStoragePath(publicUrl: string): string | null {
  const marker = '/storage/v1/object/public/highlights/'
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(publicUrl.slice(idx + marker.length).split('?')[0])
}

export default async function HighlightsPage() {
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('highlights')
    .select('id, title, youtube_id, video_url, created_at')
    .order('created_at', { ascending: false })

  // Pour les vidéos uploadées, remplacer l'URL publique par une URL signée (1h)
  // Cela contourne les policies RLS sur storage.objects
  const highlights = await Promise.all(
    (rows ?? []).map(async (h) => {
      if (h.video_url && !h.youtube_id) {
        const path = extractStoragePath(h.video_url)
        if (path) {
          const { data } = await admin.storage.from('highlights').createSignedUrl(path, 3600)
          if (data?.signedUrl) return { ...h, video_url: data.signedUrl }
        }
      }
      return h
    })
  )

  return <HighlightsClient highlights={highlights} />
}
