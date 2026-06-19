import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/superAdminAudit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_super_admin, pseudo').eq('id', user.id).single()
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type } = await req.json() as { type: 'duel' | 'penalty' }

  const table = type === 'penalty' ? 'penalty_battles' : 'duels'
  const { error } = await admin
    .from(table)
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', type === 'penalty' ? ['invited', 'waiting', 'picking'] : ['open', 'invited', 'picking', 'stealing'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    adminId: user.id,
    adminPseudo: me.pseudo,
    action: 'force_end_battle',
    metadata: { battleId: id, type },
  })

  return NextResponse.json({ ok: true })
}
