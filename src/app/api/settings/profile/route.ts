import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { pseudo, nation } = body

  const updates: Record<string, string> = {}

  if (pseudo !== undefined) {
    const trimmed = pseudo.trim()
    if (!trimmed || trimmed.length < 3 || trimmed.length > 20) {
      return NextResponse.json({ error: 'Pseudo invalide (3–20 caractères)' }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Pseudo : lettres, chiffres, _ - . seulement' }, { status: 400 })
    }
    updates.pseudo = trimmed
  }

  if (nation !== undefined) {
    updates.nation = nation
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check pseudo uniqueness
  if (updates.pseudo) {
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('pseudo', updates.pseudo)
      .neq('id', user.id)
      .single()
    if (existing) return NextResponse.json({ error: 'Ce pseudo est déjà pris' }, { status: 409 })
  }

  const { error } = await admin.from('users').update(updates).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updates })
}
