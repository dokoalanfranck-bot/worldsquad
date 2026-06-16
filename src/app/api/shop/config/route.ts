import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin.from('shop_config').select('*').limit(1).single()
  return NextResponse.json(data ?? { orange_money: '', mtn: '', prices_fcfa: { starter: 500, fan: 1500, ultra: 3500 }, is_active: true })
}
