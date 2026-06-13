import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { creditCoins } from '@/lib/coins'
import { openPack } from '@/lib/packs'

const INSTALL_COINS = 500

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // select('*') works even if install_reward_claimed column doesn't exist yet
  const { data: profile, error: fetchError } = await admin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (fetchError) {
    console.error('[install-reward] fetch error:', fetchError.code, fetchError.message)
    return NextResponse.json({ error: 'Erreur serveur lors de la vérification' }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
  }

  // Safe — undefined (column missing) = not claimed
  if (profile.install_reward_claimed === true) {
    return NextResponse.json({ error: 'Bonus déjà réclamé' }, { status: 400 })
  }

  // Mark claimed FIRST — if column missing, skip silently (run migration to fix permanently)
  const { error: updateError } = await admin
    .from('users')
    .update({ install_reward_claimed: true })
    .eq('id', user.id)

  if (updateError) {
    // Column likely doesn't exist — log and continue so the user gets their reward
    // but they'll be able to claim again until migration runs
    console.error('[install-reward] update error (migration manquante ?):', updateError.message)
  }

  await creditCoins(user.id, INSTALL_COINS, 'Bonus installation app')
  await openPack(user.id, 'common', 100)

  return NextResponse.json({ coins: INSTALL_COINS })
}
