import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await admin.from('mission_config').select('*').limit(1).maybeSingle()
  return NextResponse.json(data ?? { prediction_coins: 300, pack_coins: 30, battle_coins: 300, bonus_coins: 200 })
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { prediction_coins, pack_coins, battle_coins, bonus_coins } = body

  if (
    typeof prediction_coins !== 'number' ||
    typeof pack_coins !== 'number' ||
    typeof battle_coins !== 'number' ||
    typeof bonus_coins !== 'number'
  ) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { data: existing } = await admin.from('mission_config').select('id').limit(1).maybeSingle()

  let result
  if (existing?.id) {
    const { data, error } = await admin
      .from('mission_config')
      .update({ prediction_coins, pack_coins, battle_coins, bonus_coins, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    const { data, error } = await admin
      .from('mission_config')
      .insert({ prediction_coins, pack_coins, battle_coins, bonus_coins })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }

  return NextResponse.json(result)
}
