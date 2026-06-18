import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: updated } = await admin
    .from('penalty_battles')
    .update({
      status: 'picking',
      picks_deadline: new Date(Date.now() + 300000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'invited')
    .eq('opponent_id', user.id)
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Défi introuvable ou expiré' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
