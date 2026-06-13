import { createAdminClient } from '@/lib/supabase/admin'
import { creditCoins } from '@/lib/coins'

export const MISSION_REWARDS = {
  prediction: 300,
  pack: 30,
  battle: 300,
  bonus: 200,
} as const

export type MissionType = 'prediction' | 'pack' | 'battle'

const DONE_FIELD: Record<MissionType, 'prediction_done' | 'pack_done' | 'battle_won'> = {
  prediction: 'prediction_done',
  pack: 'pack_done',
  battle: 'battle_won',
}

const MISSION_LABEL: Record<MissionType, string> = {
  prediction: 'Pronostic',
  pack: 'Pack',
  battle: 'Battle',
}

export interface DailyMissionsRow {
  id: string
  user_id: string
  date: string
  prediction_done: boolean
  pack_done: boolean
  battle_won: boolean
  bonus_claimed: boolean
  created_at: string
}

export async function getTodayMissions(userId: string): Promise<DailyMissionsRow | null> {
  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await admin
    .from('daily_missions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existing) return existing as DailyMissionsRow

  const { data: created } = await admin
    .from('daily_missions')
    .insert({ user_id: userId, date: today })
    .select()
    .single()

  return (created ?? null) as DailyMissionsRow | null
}

export async function completeMission(
  userId: string,
  type: MissionType
): Promise<{ alreadyDone: boolean; coins: number }> {
  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: current } = await admin
    .from('daily_missions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  // Create row if it doesn't exist
  if (!current) {
    await admin.from('daily_missions').insert({ user_id: userId, date: today })
  }

  const field = DONE_FIELD[type]
  if (current?.[field]) return { alreadyDone: true, coins: 0 }

  await admin
    .from('daily_missions')
    .update({ [field]: true })
    .eq('user_id', userId)
    .eq('date', today)

  const coins = MISSION_REWARDS[type]
  await creditCoins(userId, coins, `Mission du jour — ${MISSION_LABEL[type]}`)

  return { alreadyDone: false, coins }
}

export async function claimDailyBonus(
  userId: string
): Promise<{ success: boolean; coins: number; error?: string }> {
  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: row } = await admin
    .from('daily_missions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (!row) return { success: false, coins: 0, error: 'Aucune mission trouvée' }
  if (!(row as DailyMissionsRow).prediction_done || !(row as DailyMissionsRow).pack_done || !(row as DailyMissionsRow).battle_won) {
    return { success: false, coins: 0, error: 'Toutes les missions ne sont pas encore complètes' }
  }
  if ((row as DailyMissionsRow).bonus_claimed) {
    return { success: false, coins: 0, error: 'Bonus déjà réclamé' }
  }

  await admin
    .from('daily_missions')
    .update({ bonus_claimed: true })
    .eq('user_id', userId)
    .eq('date', today)

  const coins = MISSION_REWARDS.bonus
  await creditCoins(userId, coins, 'Bonus missions du jour — Complet !')

  return { success: true, coins }
}
