import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ? user : null
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = '/storage/v1/object/public/highlights/'
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(publicUrl.slice(idx + marker.length).split('?')[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  // Récupérer d'abord pour nettoyer le fichier storage si nécessaire
  const { data: highlight } = await admin
    .from('highlights')
    .select('video_url')
    .eq('id', id)
    .single()

  const { error } = await admin.from('highlights').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Nettoyer le fichier uploadé si c'est une vidéo directe
  if (highlight?.video_url) {
    const path = extractStoragePath(highlight.video_url)
    if (path) {
      await admin.storage.from('highlights').remove([path])
    }
  }

  return NextResponse.json({ success: true })
}
