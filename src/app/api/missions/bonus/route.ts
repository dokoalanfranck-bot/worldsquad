import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { claimDailyBonus } from '@/lib/missions'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await claimDailyBonus(user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ coins: result.coins })
}
