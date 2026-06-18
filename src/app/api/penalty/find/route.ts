import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/feature-flags'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  if (!await isFeatureEnabled('penalty_battles_enabled')) {
    return NextResponse.json({ error: 'Le mode Tirs au but est temporairement désactivé' }, { status: 503 })
  }

  const admin = createAdminClient()

  // Cancel lingering invited penalties this challenger abandoned
  await admin.from('penalty_battles')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('challenger_id', user.id)
    .eq('status', 'invited')

  // Return existing active battle if any
  const { data: existing } = await admin
    .from('penalty_battles')
    .select('id')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in('status', ['waiting', 'picking', 'active', 'stealing'])
    .maybeSingle()

  if (existing) return NextResponse.json({ battleId: existing.id })

  // Try to join a waiting battle
  const { data: open } = await admin
    .from('penalty_battles')
    .select('id')
    .eq('status', 'waiting')
    .neq('challenger_id', user.id)
    .is('opponent_id', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (open) {
    await admin
      .from('penalty_battles')
      .update({
        opponent_id: user.id,
        status: 'picking',
        picks_deadline: new Date(Date.now() + 300000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', open.id)
      .eq('status', 'waiting')

    return NextResponse.json({ battleId: open.id })
  }

  // Create a new waiting battle
  const { data: created, error } = await admin
    .from('penalty_battles')
    .insert({ challenger_id: user.id, status: 'waiting' })
    .select('id')
    .single()

  if (error || !created) return NextResponse.json({ error: 'Impossible de créer la battle' }, { status: 500 })

  return NextResponse.json({ battleId: created.id })
}
