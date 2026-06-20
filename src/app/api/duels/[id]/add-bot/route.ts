import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBotName, seededShuffle, isCoach, isGK } from '@/lib/duel-engine'
import type { Card } from '@/types'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: duelId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: duel } = await admin
    .from('duels')
    .select('id, status, challenger_id, stake_count')
    .eq('id', duelId)
    .single()

  if (!duel) return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })
  if (duel.status !== 'open') return NextResponse.json({ success: true, skipped: true })
  if (duel.challenger_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Load a large card pool and shuffle deterministically per duelId for variety
  const { data: cards } = await admin
    .from('cards')
    .select('id, name, rarity, image_url, stats, type, nation, description, created_at')
    .neq('rarity', 'Legend')
    .limit(200)

  const pool    = seededShuffle((cards ?? []) as unknown as Card[], duelId)

  const coaches     = pool.filter(isCoach)
  const goalkeepers = pool.filter(isGK)
  const fieldCards  = pool.filter((c) => !isCoach(c) && !isGK(c))

  const coach = coaches[0]   ?? pool[pool.length - 1]
  const gk    = goalkeepers[0] ?? pool[pool.length - 2]

  // Max 1 carte Epic parmi les 4 joueurs de champ
  const epicField    = fieldCards.filter((c) => c.rarity === 'Epic').slice(0, 1)
  const nonEpicField = fieldCards.filter((c) => c.rarity !== 'Epic')
  const field = [...epicField, ...nonEpicField].slice(0, 4)

  const botPicks: Card[] = [...field, gk, coach].filter(Boolean).slice(0, 6)

  const deadline = new Date(Date.now() + 300000).toISOString()

  const { data: updated } = await admin
    .from('duels')
    .update({
      is_bot:         true,
      bot_name:       randomBotName(),
      opponent_picks: botPicks,
      status:         'picking',
      picks_deadline: deadline,
    })
    .eq('id', duelId)
    .eq('status', 'open')
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ success: true, skipped: true })
  }

  return NextResponse.json({ success: true })
}
