import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin.from('shop_config').select('*').limit(1).maybeSingle()
  return NextResponse.json(
    data ?? { orange_money: '', mtn: '', d17: '', prices_fcfa: { starter: 500, fan: 1500, ultra: 3500 }, prices_dt: { starter: 5, fan: 15, ultra: 35 }, is_active: true },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
