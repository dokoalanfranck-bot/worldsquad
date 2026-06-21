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

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('highlights')
    .select('id, title, youtube_id, match_id, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ highlights: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, youtube_url, match_id } = await req.json() as {
    title: string
    youtube_url: string
    match_id?: string
  }

  if (!title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

  const youtube_id = extractYouTubeId(youtube_url ?? '')
  if (!youtube_id) return NextResponse.json({ error: 'URL YouTube invalide' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('highlights')
    .insert({ title: title.trim(), youtube_id, match_id: match_id || null })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
