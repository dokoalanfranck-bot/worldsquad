import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin.from('shop_config').select('*').limit(1).maybeSingle()
  const d = data as Record<string, unknown> | null
  return NextResponse.json(
    {
      orange_money: d?.orange_money ?? '',
      mtn:          d?.mtn ?? '',
      d17:          d?.d17 ?? '',
      prices_fcfa:  d?.prices_fcfa ?? { starter: 500, fan: 1500, ultra: 3500 },
      prices_dt:    d?.prices_dt   ?? { starter: 5, fan: 15, ultra: 35 },
      is_active:    d?.is_active   ?? true,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
