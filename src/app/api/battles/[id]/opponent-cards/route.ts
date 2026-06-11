import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('challenger_id, opponent_id, winner_id, phase')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.winner_id !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  if (battle.phase !== 'pick_reward') return NextResponse.json({ error: 'Phase incorrecte' }, { status: 400 })

  const loserId = user.id === battle.challenger_id ? battle.opponent_id : battle.challenger_id

  // Cartes du perdant
  const { data: loserCardsRaw } = await admin
    .from('user_cards')
    .select('card:cards(id, name, rarity, image_url, stats, type, nation, position, flag)')
    .eq('user_id', loserId)
    .order('obtained_at', { ascending: false })

  // Cartes du gagnant (pour filtrer les doublons)
  const { data: winnerCardsRaw } = await admin
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user.id)

  const alreadyOwned = new Set((winnerCardsRaw ?? []).map((c) => c.card_id))

  const cards = (loserCardsRaw ?? [])
    .map((uc) => uc.card)
    .filter(Boolean)
    .filter((c) => !alreadyOwned.has((c as unknown as { id: string }).id))

  return NextResponse.json({ cards })
}
