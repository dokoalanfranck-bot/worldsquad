import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: membership } = await admin
    .from('group_members')
    .select('group_id, group:groups(creator_id)')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Tu n\'es dans aucun groupe' }, { status: 400 })
  }

  await admin.from('group_members').delete().eq('user_id', user.id).eq('group_id', membership.group_id)

  // If creator leaves and group is empty, delete the group
  const { count } = await admin
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', membership.group_id)

  if (count === 0) {
    await admin.from('groups').delete().eq('id', membership.group_id)
  }

  return NextResponse.json({ success: true })
}
