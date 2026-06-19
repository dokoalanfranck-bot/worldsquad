import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAll } from '@/lib/push'
import { logAudit } from '@/lib/superAdminAudit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_super_admin, pseudo').eq('id', user.id).single()
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, body, url } = await req.json() as { title: string; body: string; url?: string }
  if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: 'Titre et message requis' }, { status: 400 })

  await sendPushToAll({ title, body, url: url ?? '/dashboard', tag: 'broadcast' })

  await logAudit({
    adminId: user.id,
    adminPseudo: me.pseudo,
    action: 'broadcast',
    metadata: { title, body, url },
  })

  return NextResponse.json({ ok: true })
}
