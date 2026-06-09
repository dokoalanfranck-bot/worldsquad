import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: battleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { cardIds } = await req.json() as { cardIds: string[] }
  if (!Array.isArray(cardIds) || cardIds.length !== 3) {
    return NextResponse.json({ error: '3 cartes exactement requises' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: battle } = await admin
    .from('battles')
    .select('id, challenger_id, opponent_id, phase, challenger_draft, opponent_draft')
    .eq('id', battleId)
    .single()

  if (!battle) return NextResponse.json({ error: 'Battle introuvable' }, { status: 404 })
  if (battle.phase !== 'draft') return NextResponse.json({ error: 'Pas en phase draft' }, { status: 400 })
  if (battle.challenger_id !== user.id && battle.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const isChallenger = battle.challenger_id === user.id

  // Already drafted?
  if (isChallenger && battle.challenger_draft) return NextResponse.json({ error: 'Déjà draffé' }, { status: 400 })
  if (!isChallenger && battle.opponent_draft) return NextResponse.json({ error: 'Déjà draffé' }, { status: 400 })

  // Verify ownership
  const { data: owned } = await admin
    .from('user_cards')
    .select('card_id')
    .eq('user_id', user.id)
    .in('card_id', cardIds)

  if (!owned || owned.length < 3) {
    return NextResponse.json({ error: 'Tu ne possèdes pas toutes ces cartes' }, { status: 403 })
  }

  // Fetch card details (store snapshot with stats)
  const { data: cards } = await admin
    .from('cards')
    .select('id, name, rarity, image_url, stats, type, nation')
    .in('id', cardIds)

  const draftField = isChallenger ? 'challenger_draft' : 'opponent_draft'
  const otherDraft = isChallenger ? battle.opponent_draft : battle.challenger_draft

  const update: Record<string, unknown> = { [draftField]: cards }

  // Both drafted → advance to ban phase
  if (otherDraft) {
    update.phase = 'ban'
  }

  await admin.from('battles').update(update).eq('id', battleId)

  return NextResponse.json({ success: true, phase: otherDraft ? 'ban' : 'draft' })
}
