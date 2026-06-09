import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('id, opponent_id, status')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.opponent_id !== user.id) return NextResponse.json({ error: 'Pas ton battle' }, { status: 403 })
  if (battle.status !== 'pending') return NextResponse.json({ error: 'Battle déjà résolu' }, { status: 400 })

  await admin.from('battles').update({ status: 'declined' }).eq('id', battleId)

  return NextResponse.json({ success: true })
}
