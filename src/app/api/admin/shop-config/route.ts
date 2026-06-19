import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    orange_money?: string
    mtn?: string
    d17?: string
    prices_fcfa?: Record<string, number>
    prices_dt?: Record<string, number>
    is_active?: boolean
  }

  // Only include d17/prices_dt if they are provided (columns may not exist before migration 032)
  const { d17, prices_dt, ...baseBody } = body
  const payload: Record<string, unknown> = { ...baseBody, updated_at: new Date().toISOString() }
  if (d17     !== undefined) payload.d17       = d17
  if (prices_dt !== undefined) payload.prices_dt = prices_dt

  const { data: existing } = await admin.from('shop_config').select('id').limit(1).maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('shop_config')
      .update(payload)
      .eq('id', existing.id)

    if (error) {
      console.error('[shop-config] update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await admin.from('shop_config').insert(payload)
    if (error) {
      console.error('[shop-config] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
