import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'


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

export async function POST() {
  const authUser = await checkAdmin()
  if (!authUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // 1. Supprimer toutes les cartes obtenues par tous les utilisateurs
  const { error: cardsError } = await admin.from('user_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (cardsError) return NextResponse.json({ error: `user_cards: ${cardsError.message}` }, { status: 500 })

  // 2. Remettre les coins Ã  500 et les stats battles Ã  0 pour tous les utilisateurs
  const { error: usersError } = await admin
    .from('users')
    .update({
      coins: 500,
      battles_played: 0,
      battle_streak: 0,
      best_streak: 0,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (usersError) return NextResponse.json({ error: `users: ${usersError.message}` }, { status: 500 })

  return NextResponse.json({ success: true })
}
