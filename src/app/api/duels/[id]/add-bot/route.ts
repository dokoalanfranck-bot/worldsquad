import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBotName } from '@/lib/duel-engine'
import type { Card } from '@/types'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: duel } = await admin
    .from('duels')
    .select('id, status, challenger_id')
    .eq('id', duelId)
    .single()

  if (!duel) return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })
  if (duel.status !== 'open') return NextResponse.json({ success: true, skipped: true })
  if (duel.challenger_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Bot picks: top 4 cards from global cards table (best rarity mix)
  const { data: cards } = await admin
    .from('cards')
    .select('id, name, rarity, image_url, stats, type, nation, position, flag')
    .order('rarity', { ascending: false })
    .limit(40)

  const pool = (cards ?? []) as unknown as Card[]
  const isCoach = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'COACH'
  const players = pool.filter((c) => !isCoach(c)).slice(0, 3)
  const coach = pool.find(isCoach) ?? pool[3]
  const botPicks: Card[] = coach ? [...players, coach] : players.slice(0, 4)

  const deadline = new Date(Date.now() + 45000).toISOString()

  const { data: updated } = await admin
    .from('duels')
    .update({
      is_bot: true,
      bot_name: randomBotName(),
      opponent_picks: botPicks,
      status: 'picking',
      picks_deadline: deadline,
    })
    .eq('id', duelId)
    .eq('status', 'open') // atomic — don't override if someone just joined
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ success: true, skipped: true })
  }

  return NextResponse.json({ success: true })
}
