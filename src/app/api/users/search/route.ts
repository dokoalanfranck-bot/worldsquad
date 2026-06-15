import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ users: [] })

  const admin = createAdminClient()

  const { data: users } = await admin
    .from('users')
    .select('id, pseudo, nation, photo_url')
    .ilike('pseudo', `%${q}%`)
    .neq('id', user.id)
    .limit(10)

  return NextResponse.json({ users: users ?? [] })
}
