import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_super_admin').eq('id', user.id).single()
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
  const limit = 30
  const offset = (page - 1) * limit

  let query = admin.from('users')
    .select('id, pseudo, email, nation, photo_url, coins, battles_played, battles_won, pack_opened, is_admin, is_super_admin, is_banned, ban_reason, last_seen_at, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q.trim()) {
    query = query.ilike('pseudo', `%${q.trim()}%`)
  }

  const { data: users, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: users ?? [], total: count ?? 0, page, limit })
}
