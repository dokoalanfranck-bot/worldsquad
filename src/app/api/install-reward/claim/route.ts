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
  const { data: profile } = await admin
    .from('users')
    .select('install_reward_claimed')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile introuvable' }, { status: 404 })
  if (profile.install_reward_claimed) {
    return NextResponse.json({ error: 'Bonus déjà réclamé' }, { status: 400 })
  }

  // Mark claimed first to prevent double-claim
  await admin.from('users').update({ install_reward_claimed: true }).eq('id', user.id)

  // Credit coins
  await creditCoins(user.id, INSTALL_COINS, 'Bonus installation app')

  // Free common pack (silently added to collection)
  await openPack(user.id, 'common', 100)

  return NextResponse.json({ coins: INSTALL_COINS })
}
