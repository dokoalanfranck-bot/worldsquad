import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { openPack } from '@/lib/packs'
import { debitCoins, creditCoins } from '@/lib/coins'
import { completeMission } from '@/lib/missions'
import { PACK_CONFIGS } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { packType } = await req.json() as { packType: keyof typeof PACK_CONFIGS }
    if (!PACK_CONFIGS[packType]) return NextResponse.json({ error: 'Type de pack invalide' }, { status: 400 })

    const config = PACK_CONFIGS[packType]

    const admin = createAdminClient()
    let globalProgression = 100
    if (packType !== 'legend') {
      const [{ count: totalCards }, { count: ownedCards }] = await Promise.all([
        admin.from('cards').select('*', { count: 'exact', head: true }).eq('type', 'player'),
        admin.from('user_cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      globalProgression = totalCards ? Math.round(((ownedCards ?? 0) / totalCards) * 100) : 0
    }

    const { success, newBalance, error: debitError } = await debitCoins(
      user.id,
      config.cost,
      `Ouverture ${config.name}`
    )
    if (!success) return NextResponse.json({ error: debitError ?? 'Coins insuffisants' }, { status: 400 })

    const { cards, error } = await openPack(user.id, packType, globalProgression)
    if (error) {
      await creditCoins(user.id, config.cost, `Remboursement ${config.name}`)
      return NextResponse.json({ error }, { status: 500 })
    }

    const mission = await completeMission(user.id, 'pack')
    return NextResponse.json({ cards, newBalance, mission: mission.alreadyDone ? null : { coins: mission.coins } })
  } catch (err) {
    console.error('[packs/open]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
