import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { completeMission, type MissionType } from '@/lib/missions'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type } = await req.json() as { type: MissionType }
  if (!['prediction', 'pack', 'battle'].includes(type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  const result = await completeMission(user.id, type)
  return NextResponse.json(result)
}
