import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodayMissions } from '@/lib/missions'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const missions = await getTodayMissions(user.id)
  return NextResponse.json(missions)
}
