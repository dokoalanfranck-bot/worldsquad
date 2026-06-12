import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: duel } = await admin
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single()

  if (!duel) return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Enrich with profiles
  const [{ data: challenger }, { data: opponent }] = await Promise.all([
    admin.from('users').select('id, pseudo, nation, photo_url').eq('id', duel.challenger_id).single(),
    duel.opponent_id
      ? admin.from('users').select('id, pseudo, nation, photo_url').eq('id', duel.opponent_id).single()
      : Promise.resolve({ data: null }),
  ])

  // Enrich reward card
  const { data: rewardCard } = duel.reward_card_id
    ? await admin.from('cards').select('*').eq('id', duel.reward_card_id).single()
    : { data: null }

  return NextResponse.json({
    ...duel,
    challenger,
    opponent: opponent ?? { id: null, pseudo: duel.bot_name ?? 'Bot', nation: '🤖', photo_url: null },
    reward_card: rewardCard,
  })
}
