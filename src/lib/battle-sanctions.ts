import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

const ABANDON_BAN_THRESHOLD = 3
const BAN_DURATION_MS = 30 * 60 * 1000 // 30 minutes

export async function trackAbandon(userId: string, admin: AdminClient): Promise<void> {
  const { data } = await admin
    .from('users')
    .select('abandon_count')
    .eq('id', userId)
    .single()

  const current = data?.abandon_count ?? 0
  const next = current + 1
  const willBan = next >= ABANDON_BAN_THRESHOLD

  await admin.from('users').update({
    abandon_count: willBan ? 0 : next,
    ...(willBan && { battle_ban_until: new Date(Date.now() + BAN_DURATION_MS).toISOString() }),
  }).eq('id', userId)
}

export async function checkAndClearBan(
  userId: string,
  admin: AdminClient
): Promise<{ banned: boolean; banUntil: string | null; abandonCount: number }> {
  const { data } = await admin
    .from('users')
    .select('abandon_count, battle_ban_until')
    .eq('id', userId)
    .single()

  const banUntil = data?.battle_ban_until ?? null
  const abandonCount = data?.abandon_count ?? 0

  if (!banUntil) return { banned: false, banUntil: null, abandonCount }

  const expired = new Date(banUntil) <= new Date()
  if (expired) {
    await admin.from('users').update({ battle_ban_until: null, abandon_count: 0 }).eq('id', userId)
    return { banned: false, banUntil: null, abandonCount: 0 }
  }

  return { banned: true, banUntil, abandonCount }
}
