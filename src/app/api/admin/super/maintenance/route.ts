import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/superAdminAudit'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin.from('app_settings').select('value').eq('key', 'maintenance_mode').single()
  return NextResponse.json(data?.value ?? { enabled: false, message: '' })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_super_admin, pseudo').eq('id', user.id).single()
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { enabled, message } = await req.json() as { enabled: boolean; message?: string }

  await admin.from('app_settings').update({
    value: { enabled, message: message ?? '' },
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }).eq('key', 'maintenance_mode')

  await logAudit({
    adminId: user.id,
    adminPseudo: me.pseudo,
    action: enabled ? 'maintenance_on' : 'maintenance_off',
    metadata: { message: message ?? '' },
  })

  return NextResponse.json({ ok: true, enabled })
}
