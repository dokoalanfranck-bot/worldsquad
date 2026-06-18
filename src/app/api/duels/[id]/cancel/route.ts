import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: updated } = await admin
    .from('duels')
    .update({ status: 'cancelled' })
    .eq('id', duelId)
    .in('status', ['open', 'picking', 'stealing'])
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Duel introuvable ou déjà en cours de jeu' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
