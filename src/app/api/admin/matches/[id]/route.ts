import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', authUser.id)
    .single()

  if (!profile?.is_admin) return null
  return authUser
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const body = await req.json()

  // Remove internal flags before DB update
  const { _trigger_calculate, ...dbFields } = body

  // Only update if there are actual DB fields
  let data: Record<string, unknown> | null = null
  if (Object.keys(dbFields).length > 0) {
    const { data: updated, error } = await admin
      .from('matches')
      .update(dbFields)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    data = updated
  }

  // Optionally trigger prediction calculation
  const url = new URL(req.url)
  if (url.searchParams.get('calculate') === 'true' || _trigger_calculate) {
    // Use internal fetch with service role key
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:3000`
    await fetch(`${baseUrl}/api/admin/calculate-match/${params.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }).catch(() => {})
  }

  return NextResponse.json(data ?? { success: true })
}
