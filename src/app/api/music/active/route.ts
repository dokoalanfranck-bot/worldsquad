import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('music_tracks')
    .select('id, name, url, type')
    .eq('active', true)

  const ambiance = data?.find((t) => t.type === 'ambiance') ?? null
  const pack_opening = data?.find((t) => t.type === 'pack_opening') ?? null

  return NextResponse.json({ ambiance, pack_opening })
}
