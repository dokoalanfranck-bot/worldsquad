import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { cardIds } = await req.json() as { cardIds: string[] }
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: 'cardIds requis' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: duel } = await admin
    .from('duels')
    .select('id, status, winner_id, challenger_id, opponent_id, stake_count, stolen_card_ids, is_bot')
    .eq('id', duelId)
    .single()

  if (!duel) return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })
  if (duel.status !== 'stealing') return NextResponse.json({ error: 'Phase incorrecte' }, { status: 400 })
  if (duel.winner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const stakeCount = duel.stake_count ?? 1
  if (cardIds.length !== stakeCount) {
    return NextResponse.json({ error: `Exactement ${stakeCount} carte(s) requise(s)` }, { status: 400 })
  }

  // Verify all chosen cards are in stolen_card_ids (loser's played cards)
  const available = new Set<string>(duel.stolen_card_ids ?? [])
  if (!cardIds.every((id) => available.has(id))) {
    return NextResponse.json({ error: 'Cartes non disponibles' }, { status: 400 })
  }

  const loserId = duel.winner_id === duel.challenger_id ? duel.opponent_id : duel.challenger_id

  // Transfer cards from loser to winner (skip if bot battle — bot has no real user_cards)
  if (loserId && !duel.is_bot) {
    await Promise.all(
      cardIds.map((cardId) =>
        admin.from('user_cards').delete().eq('user_id', loserId).eq('card_id', cardId)
      )
    )
  }

  // Add cards to winner's collection — skip cards already owned (avoids unique constraint errors)
  for (const cardId of cardIds) {
    const { data: existing } = await admin.from('user_cards')
      .select('card_id').eq('user_id', user.id).eq('card_id', cardId).maybeSingle()
    if (!existing) {
      const { error: insErr } = await admin.from('user_cards').insert({
        user_id: user.id, card_id: cardId, obtained_via: 'battle',
      })
      if (insErr && insErr.code !== '23505') {
        console.error('[steal] insert user_cards failed:', insErr)
        return NextResponse.json({ error: 'Erreur lors du transfert des cartes' }, { status: 500 })
      }
    }
  }

  // Mark duel finished
  await admin.from('duels').update({
    status:          'finished',
    stolen_card_ids: cardIds,
  }).eq('id', duelId)

  return NextResponse.json({ success: true })
}
