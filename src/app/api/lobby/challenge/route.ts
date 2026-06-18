import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'
import { seededShuffle, randomBotName } from '@/lib/duel-engine'
import type { Card } from '@/types'

const isCoach = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'COACH'
const isGK    = (c: Card) => String(c.stats?.position ?? '').toUpperCase() === 'GK'

async function buildBotPicks(admin: ReturnType<typeof createAdminClient>, duelId: string): Promise<Card[]> {
  const { data: cards } = await admin.from('cards')
    .select('id, name, rarity, image_url, stats, type, nation, description, created_at')
    .eq('type', 'player')
    .limit(200)
  const pool        = seededShuffle((cards ?? []) as unknown as Card[], duelId)
  const coach       = pool.find(isCoach)  ?? pool[pool.length - 1]
  const gk          = pool.find(isGK)     ?? pool[pool.length - 2]
  const fieldCards  = pool.filter((c) => !isCoach(c) && !isGK(c))
  return [...fieldCards.slice(0, 4), gk, coach].filter(Boolean).slice(0, 6)
}

// Penalty format: [shooter0, shooter1, shooter2, gk] — 4 cards only
async function buildBotPenaltyPicks(admin: ReturnType<typeof createAdminClient>, battleId: string): Promise<Card[]> {
  const { data: cards } = await admin.from('cards')
    .select('id, name, rarity, image_url, stats, type, nation, description, created_at')
    .eq('type', 'player')
    .limit(200)
  const pool     = seededShuffle((cards ?? []) as unknown as Card[], battleId)
  const gk       = pool.find(isGK) ?? pool[pool.length - 1]
  const shooters = pool.filter((c) => !isCoach(c) && !isGK(c))
  return [...shooters.slice(0, 3), gk].filter(Boolean)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json() as {
    targetUserId?: string
    botName?: string
    mode: 'duel' | 'penalty'
    stakeCount?: number
  }
  const { targetUserId, botName, mode, stakeCount = 1 } = body
  const isBot = !!botName

  const admin = createAdminClient()

  // Admins cannot participate in battles
  const { data: me } = await admin.from('users').select('pseudo, is_admin').eq('id', user.id).single()
  if (me?.is_admin) return NextResponse.json({ error: 'Les comptes admin ne peuvent pas participer aux battles' }, { status: 403 })

  // ── Cleanup: cancel orphaned challenger sessions before creating a new one ─
  const [{ data: oldDuels }, { data: oldPenalties }] = await Promise.all([
    admin.from('duels')
      .select('id, is_bot, opponent_id, challenger_picks, status')
      .eq('challenger_id', user.id)
      .in('status', ['invited', 'open', 'picking']),
    admin.from('penalty_battles')
      .select('id')
      .eq('challenger_id', user.id)
      .in('status', ['invited', 'waiting', 'picking']),
  ])

  if (oldDuels && oldDuels.length > 0) {
    await Promise.all(oldDuels.map(async (d) => {
      const challPickIds = (d.challenger_picks as Array<{ id: string }> | null)?.map((c) => c.id) ?? []
      const canForfeit = d.status === 'picking' && !d.is_bot && d.opponent_id && challPickIds.length > 0
      if (canForfeit) {
        await admin.from('duels').update({
          status: 'stealing', winner_id: d.opponent_id,
          stolen_card_ids: challPickIds, updated_at: new Date().toISOString(),
        }).eq('id', d.id).eq('status', 'picking')
      } else {
        await admin.from('duels').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', d.id)
      }
    }))
  }

  if (oldPenalties && oldPenalties.length > 0) {
    await admin.from('penalty_battles')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('challenger_id', user.id)
      .in('status', ['invited', 'waiting', 'picking'])
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ── BOT CHALLENGE ─────────────────────────────────────────────────────────
  if (isBot) {
    if (mode === 'duel') {
      const { data: duel } = await admin.from('duels').insert({
        challenger_id: user.id,
        is_bot: true,
        bot_name: botName,
        status: 'open',
        coins_stake: 50,
        stake_count: stakeCount,
      }).select('id').single()

      if (!duel) return NextResponse.json({ error: 'Erreur création duel bot' }, { status: 500 })

      // Add bot picks immediately
      const botPicks = await buildBotPicks(admin, duel.id)
      await admin.from('duels').update({
        opponent_picks: botPicks,
        status: 'picking',
        picks_deadline: new Date(Date.now() + 300000).toISOString(),
      }).eq('id', duel.id)

      return NextResponse.json({ duelId: duel.id, mode: 'duel' })
    }

    if (mode === 'penalty') {
      const { data: battle } = await admin.from('penalty_battles').insert({
        challenger_id: user.id,
        is_bot: true,
        bot_name: botName ?? randomBotName(),
        status: 'picking',
        picks_deadline: new Date(Date.now() + 300000).toISOString(),
        stake_count: stakeCount,
      }).select('id').single()

      if (!battle) return NextResponse.json({ error: 'Erreur création penalty bot' }, { status: 500 })

      // Add bot picks immediately (penalty format: 3 shooters + 1 GK)
      const botPicks = await buildBotPenaltyPicks(admin, battle.id)
      await admin.from('penalty_battles').update({
        opponent_picks: botPicks,
      }).eq('id', battle.id)

      return NextResponse.json({ battleId: battle.id, mode: 'penalty' })
    }
  }

  // ── PLAYER CHALLENGE ──────────────────────────────────────────────────────
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId requis' }, { status: 400 })
  if (targetUserId === user.id) return NextResponse.json({ error: 'Impossible de se défier soi-même' }, { status: 400 })

  if (mode === 'duel') {
    const { data: duel } = await admin.from('duels').insert({
      challenger_id: user.id,
      opponent_id: targetUserId,
      status: 'invited',
      stake_count: stakeCount,
      coins_stake: 50,
    }).select('id').single()

    if (!duel) return NextResponse.json({ error: 'Erreur création défi' }, { status: 500 })

    try {
      await sendPushToUser(targetUserId, {
        title: '⚔️ Défi Battle reçu !',
        body: `${me?.pseudo ?? 'Un joueur'} te défie en Battle ! Accepte avant 2 min.`,
        url: '/battles',
        tag: `invite-duel-${duel.id}`,
      })
    } catch { /* push best-effort */ }

    return NextResponse.json({ duelId: duel.id, mode: 'duel' })
  }

  if (mode === 'penalty') {
    const { data: battle } = await admin.from('penalty_battles').insert({
      challenger_id: user.id,
      opponent_id: targetUserId,
      status: 'invited',
      stake_count: stakeCount,
    }).select('id').single()

    if (!battle) return NextResponse.json({ error: 'Erreur création défi penalty' }, { status: 500 })

    try {
      await sendPushToUser(targetUserId, {
        title: '⚽ Défi Tirs au but !',
        body: `${me?.pseudo ?? 'Un joueur'} te défie aux tirs au but ! Accepte avant 2 min.`,
        url: '/battles',
        tag: `invite-penalty-${battle.id}`,
      })
    } catch { /* push best-effort */ }

    return NextResponse.json({ battleId: battle.id, mode: 'penalty' })
  }

  return NextResponse.json({ error: 'mode invalide' }, { status: 400 })
}
