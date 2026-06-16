import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { wagerUserCardId } = await req.json() as { wagerUserCardId: string }
  if (!wagerUserCardId) return NextResponse.json({ error: 'Carte requise' }, { status: 400 })

  const admin = createAdminClient()

  // Verify the user owns this card
  const { data: uc } = await admin
    .from('user_cards')
    .select('id, card_id, card:cards(id, name, rarity, image_url, stats)')
    .eq('id', wagerUserCardId)
    .eq('user_id', user.id)
    .single()

  if (!uc) return NextResponse.json({ error: 'Carte introuvable ou non possédée' }, { status: 400 })

  // Check user doesn't already have an active penalty battle
  const { data: existing } = await admin
    .from('penalty_battles')
    .select('id')
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in('status', ['waiting', 'active'])
    .maybeSingle()

  if (existing) return NextResponse.json({ battleId: existing.id })

  // Try to join an existing waiting battle (not created by the current user)
  const { data: open } = await admin
    .from('penalty_battles')
    .select('id')
    .eq('status', 'waiting')
    .neq('challenger_id', user.id)
    .is('opponent_id', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (open) {
    await admin
      .from('penalty_battles')
      .update({
        opponent_id: user.id,
        opponent_wager: wagerUserCardId,
        status: 'active',
        round_deadline: new Date(Date.now() + 5000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', open.id)
      .eq('status', 'waiting')

    return NextResponse.json({ battleId: open.id })
  }

  // Create a new waiting battle
  const { data: created, error } = await admin
    .from('penalty_battles')
    .insert({
      challenger_id: user.id,
      challenger_wager: wagerUserCardId,
      status: 'waiting',
    })
    .select('id')
    .single()

  if (error || !created) return NextResponse.json({ error: 'Impossible de créer la battle' }, { status: 500 })

  return NextResponse.json({ battleId: created.id })
}
