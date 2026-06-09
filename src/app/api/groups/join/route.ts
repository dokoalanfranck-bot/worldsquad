import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code requis' }, { status: 400 })

  const admin = createAdminClient()

  // Check already in a group
  const { data: existing } = await admin
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Tu es déjà dans un groupe. Quitte-le d\'abord.' }, { status: 400 })
  }

  // Find group by code
  const { data: group } = await admin
    .from('groups')
    .select('id, name, code')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!group) {
    return NextResponse.json({ error: 'Code invalide — vérifie et réessaie' }, { status: 404 })
  }

  // Join group
  const { error } = await admin
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id })

  if (error) {
    return NextResponse.json({ error: 'Erreur lors de l\'adhésion' }, { status: 500 })
  }

  // Log activity
  const { data: profile } = await admin.from('users').select('pseudo').eq('id', user.id).single()
  await admin.from('group_activities').insert({
    group_id: group.id,
    user_id: user.id,
    activity_type: 'joined',
    message: `${profile?.pseudo ?? 'Quelqu\'un'} a rejoint le groupe 🎉`,
  })

  return NextResponse.json({ group })
}
