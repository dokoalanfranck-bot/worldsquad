import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin.from('live_config').select('*').eq('id', 1).single()
  return NextResponse.json(data ?? {
    youtube_url: null,
    title: 'Match en Direct',
    subtitle: null,
    is_active: false,
    stream_type: 'jitsi',
    room_name: null,
    thumbnail_url: null,
    starts_at: null,
    twitch_channel: null,
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('is_admin, pseudo').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    youtube_url?: string
    title?: string
    subtitle?: string
    is_active?: boolean
    stream_type?: string
    room_name?: string
    thumbnail_url?: string
    starts_at?: string | null
    twitch_channel?: string
  }

  const admin = createAdminClient()
  const { error } = await admin.from('live_config').upsert({
    id: 1,
    youtube_url: body.youtube_url ?? null,
    title: body.title ?? 'Match en Direct',
    subtitle: body.subtitle ?? null,
    is_active: body.is_active ?? false,
    stream_type: body.stream_type ?? 'jitsi',
    room_name: body.room_name ?? null,
    thumbnail_url: body.thumbnail_url ?? null,
    starts_at: body.starts_at ?? null,
    twitch_channel: body.twitch_channel ?? null,
    updated_at: new Date().toISOString(),
    updated_by: profile.pseudo,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
