import { createAdminClient } from './supabase/admin'

export async function creditCoins(
  userId: string,
  amount: number,
  reason: string
) {
  const supabase = createAdminClient()

  const [, txResult] = await Promise.all([
    supabase.rpc('increment_coins', { user_id: userId, delta: amount }),
    supabase.from('coin_transactions').insert({ user_id: userId, amount, reason }),
  ])

  return txResult
}

export async function debitCoins(
  userId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: user } = await supabase
    .from('users')
    .select('coins')
    .eq('id', userId)
    .single()

  if (!user || user.coins < amount) {
    return { success: false, error: 'Coins insuffisants' }
  }

  await Promise.all([
    supabase
      .from('users')
      .update({ coins: user.coins - amount })
      .eq('id', userId),
    supabase
      .from('coin_transactions')
      .insert({ user_id: userId, amount: -amount, reason }),
  ])

  return { success: true }
}
