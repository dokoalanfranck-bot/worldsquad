import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const deadline = new Date(Date.now() + 300000).toISOString()

  const { data: updated } = await admin
    .from('duels')
    .update({ status: 'picking', picks_deadline: deadline })
    .eq('id', duelId)
    .eq('opponent_id', user.id)
    .eq('status', 'invited')
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Invitation introuvable ou expirée' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
