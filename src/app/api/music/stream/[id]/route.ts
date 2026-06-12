import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: track } = await admin
    .from('music_tracks')
    .select('url')
    .eq('id', id)
    .single()

  if (!track) return new Response('Not found', { status: 404 })

  // Proxy vers Supabase Storage en transmettant le header Range (pour le streaming audio)
  const rangeHeader = req.headers.get('range')
  const fetchHeaders: Record<string, string> = {}
  if (rangeHeader) fetchHeaders['Range'] = rangeHeader

  let upstream: Response
  try {
    upstream = await fetch(track.url, { headers: fetchHeaders })
  } catch {
    return new Response('Storage unreachable', { status: 502 })
  }

  const headers = new Headers()
  const ct = upstream.headers.get('content-type')
  headers.set('Content-Type', ct || 'audio/mpeg')
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'public, max-age=3600')
  const cl = upstream.headers.get('content-length')
  if (cl) headers.set('Content-Length', cl)
  const cr = upstream.headers.get('content-range')
  if (cr) headers.set('Content-Range', cr)

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}
