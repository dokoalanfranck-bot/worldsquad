import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { name } = await req.json()
  if (!name || name.trim().length < 3) {
    return NextResponse.json({ error: 'Le nom doit faire au moins 3 caractères' }, { status: 400 })
  }

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

  // Generate unique code
  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const { data: taken } = await admin.from('groups').select('id').eq('code', code).single()
    if (!taken) break
    code = generateCode()
    attempts++
  }

  // Create group
  const { data: group, error } = await admin
    .from('groups')
    .insert({ name: name.trim(), code, creator_id: user.id })
    .select()
    .single()

  if (error || !group) {
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }

  // Add creator as member
  await admin.from('group_members').insert({ group_id: group.id, user_id: user.id })

  return NextResponse.json({ group })
}
