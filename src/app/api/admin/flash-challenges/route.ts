import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { matchId, label, bonusCoins, durationHours } = await req.json() as {
    matchId?: string
    label?: string
    bonusCoins?: number
    durationHours?: number
  }

  if (!matchId || !durationHours) {
    return NextResponse.json({ error: 'matchId et durationHours requis' }, { status: 400 })
  }

  const now = new Date()
  const endsAt = new Date(now.getTime() + durationHours * 3_600_000)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('flash_challenges')
    .insert({
      match_id: matchId,
      label: label ?? 'Défi Flash',
      bonus_coins: bonusCoins ?? 100,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ challenge: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('flash_challenges').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
