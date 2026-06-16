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

  const today = new Date().toISOString().split('T')[0]

  const [missionsRes, configRes] = await Promise.all([
    admin
      .from('daily_missions')
      .select('*, user:user_id(id, pseudo, photo_url, coins)')
      .eq('date', today)
      .order('created_at', { ascending: false }),
    admin.from('mission_config').select('*').limit(1).maybeSingle(),
  ])

  const missions = missionsRes.data ?? []

  const stats = {
    total_users: missions.length,
    prediction_done: missions.filter((m) => m.prediction_done).length,
    pack_done: missions.filter((m) => m.pack_done).length,
    battle_won: missions.filter((m) => m.battle_won).length,
    bonus_claimed: missions.filter((m) => m.bonus_claimed).length,
    all_complete: missions.filter((m) => m.prediction_done && m.pack_done && m.battle_won).length,
  }

  return NextResponse.json({ stats, missions, config: configRes.data })
}
