import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'payment-screenshots'

// Extrait le chemin relatif depuis l'URL Supabase Storage
function extractStoragePath(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx !== -1) return url.slice(idx + marker.length)
  // URL déjà relative ou autre format
  const markerSign = `/object/sign/${BUCKET}/`
  const idx2 = url.indexOf(markerSign)
  if (idx2 !== -1) return url.slice(idx2 + markerSign.length).split('?')[0]
  return null
}

async function withSignedUrls<T extends { screenshot_url: string }>(
  items: T[],
  admin: ReturnType<typeof createAdminClient>
): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      const path = extractStoragePath(item.screenshot_url)
      if (!path) return item
      const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600)
      return { ...item, screenshot_url: data?.signedUrl ?? item.screenshot_url }
    })
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    { data: pending, error: pendingErr },
    { data: history, error: historyErr },
  ] = await Promise.all([
    admin
      .from('payment_requests')
      .select('*, user:user_id(pseudo, photo_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    admin
      .from('payment_requests')
      .select('*, user:user_id(pseudo, photo_url)')
      .neq('status', 'pending')
      .order('reviewed_at', { ascending: false })
      .limit(50),
  ])

  if (pendingErr) console.error('[admin/payment-requests] pending:', pendingErr.message)
  if (historyErr) console.error('[admin/payment-requests] history:', historyErr.message)

  const [pendingWithUrls, historyWithUrls] = await Promise.all([
    withSignedUrls(pending ?? [], admin),
    withSignedUrls(history ?? [], admin),
  ])

  return NextResponse.json(
    { pending: pendingWithUrls, history: historyWithUrls },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
