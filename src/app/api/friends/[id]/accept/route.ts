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
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', id)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
