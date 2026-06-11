import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ none: true })

  const admin = createAdminClient()
  const { data: battles } = await admin
    .from('battles')
    .select('id')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('type', 'team_match')
    .in('phase', ['team_selection', 'match_ready'])
    .limit(1)

  if (battles && battles.length > 0) {
    return NextResponse.json({ battleId: battles[0].id })
  }
  return NextResponse.json({ none: true })
}
