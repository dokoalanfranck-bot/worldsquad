import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: t, error } = await admin.from('tournaments').select('*').eq('id', id).single()
  if (error || !t) return NextResponse.json({ error: 'Tournoi introuvable' }, { status: 404 })
  if (t.p0_id !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  return NextResponse.json(t)
}
