import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openPack } from '@/lib/packs'
import { debitCoins, creditCoins } from '@/lib/coins'
import { PACK_CONFIGS } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { packType } = await req.json() as { packType: keyof typeof PACK_CONFIGS }
  if (!PACK_CONFIGS[packType]) return NextResponse.json({ error: 'Type de pack invalide' }, { status: 400 })

  const config = PACK_CONFIGS[packType]

  // Debit coins server-side (atomic)
  const { success, newBalance, error: debitError } = await debitCoins(
    user.id,
    config.cost,
    `Ouverture ${config.name}`
  )
  if (!success) return NextResponse.json({ error: debitError ?? 'Coins insuffisants' }, { status: 400 })

  // Select & insert cards
  const { cards, error } = await openPack(user.id, packType)
  if (error) {
    // Refund on failure
    await creditCoins(user.id, config.cost, `Remboursement ${config.name}`)
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ cards, newBalance })
}
