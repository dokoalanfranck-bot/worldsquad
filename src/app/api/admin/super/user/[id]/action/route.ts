import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/superAdminAudit'

type Action =
  | 'ban' | 'unban'
  | 'add_coins' | 'remove_coins'
  | 'make_admin' | 'remove_admin'
  | 'give_card' | 'remove_card'
  | 'reset_stats'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch admin + target in parallel
  const [{ data: me }, { data: target }] = await Promise.all([
    admin.from('users').select('is_super_admin, pseudo').eq('id', user.id).single(),
    admin.from('users').select('pseudo, is_super_admin').eq('id', targetId).single(),
  ])

  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (targetId === user.id) return NextResponse.json({ error: 'Impossible de modifier son propre compte' }, { status: 400 })
  if (target?.is_super_admin) return NextResponse.json({ error: 'Impossible de modifier un super admin' }, { status: 400 })

  const body = await req.json() as { action: Action; amount?: number; reason?: string; cardId?: string }
  const { action, amount, reason, cardId } = body

  const audit = (extra: Record<string, unknown> = {}) =>
    logAudit({
      adminId: user.id,
      adminPseudo: me.pseudo,
      action,
      targetUserId: targetId,
      targetPseudo: target?.pseudo,
      metadata: { reason, amount, cardId, ...extra },
    })

  switch (action) {
    case 'ban': {
      await admin.from('users').update({ is_banned: true, ban_reason: reason ?? null }).eq('id', targetId)
      await admin.auth.admin.updateUserById(targetId, { ban_duration: '876600h' })
      await audit()
      return NextResponse.json({ ok: true, action: 'banned' })
    }

    case 'unban': {
      await admin.from('users').update({ is_banned: false, ban_reason: null }).eq('id', targetId)
      await admin.auth.admin.updateUserById(targetId, { ban_duration: 'none' })
      await audit()
      return NextResponse.json({ ok: true, action: 'unbanned' })
    }

    case 'add_coins': {
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
      await admin.rpc('increment_coins', { user_id: targetId, delta: amount })
      await admin.from('coin_transactions').insert({
        user_id: targetId,
        amount,
        reason: `🔧 Admin grant — ${reason ?? 'Super admin action'}`,
      })
      await audit()
      return NextResponse.json({ ok: true, action: 'coins_added', amount })
    }

    case 'remove_coins': {
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
      await admin.rpc('increment_coins', { user_id: targetId, delta: -amount })
      await admin.from('coin_transactions').insert({
        user_id: targetId,
        amount: -amount,
        reason: `🔧 Admin deduct — ${reason ?? 'Super admin action'}`,
      })
      await audit()
      return NextResponse.json({ ok: true, action: 'coins_removed', amount })
    }

    case 'make_admin': {
      await admin.from('users').update({ is_admin: true }).eq('id', targetId)
      await audit()
      return NextResponse.json({ ok: true, action: 'made_admin' })
    }

    case 'remove_admin': {
      await admin.from('users').update({ is_admin: false }).eq('id', targetId)
      await audit()
      return NextResponse.json({ ok: true, action: 'admin_removed' })
    }

    case 'give_card': {
      if (!cardId) return NextResponse.json({ error: 'cardId requis' }, { status: 400 })
      const { data: card } = await admin.from('cards').select('id, name, rarity').eq('id', cardId).single()
      if (!card) return NextResponse.json({ error: 'Carte introuvable' }, { status: 404 })
      await admin.from('user_cards').insert({
        user_id: targetId,
        card_id: cardId,
        obtained_at: new Date().toISOString(),
        obtained_via: 'admin_grant',
      })
      await audit({ cardName: card.name, cardRarity: card.rarity })
      return NextResponse.json({ ok: true, action: 'card_given', cardName: card.name })
    }

    case 'remove_card': {
      if (!cardId) return NextResponse.json({ error: 'cardId requis' }, { status: 400 })
      // Get one instance of this card for the user
      const { data: uc } = await admin
        .from('user_cards')
        .select('id, cards(name, rarity)')
        .eq('user_id', targetId)
        .eq('card_id', cardId)
        .limit(1)
        .single()
      if (!uc) return NextResponse.json({ error: 'Carte introuvable dans l\'inventaire' }, { status: 404 })
      await admin.from('user_cards').delete().eq('id', uc.id)
      const cardInfo = uc.cards as { name?: string; rarity?: string } | null
      await audit({ cardName: cardInfo?.name, cardRarity: cardInfo?.rarity })
      return NextResponse.json({ ok: true, action: 'card_removed' })
    }

    case 'reset_stats': {
      await admin.from('users').update({
        battles_won: 0,
        battles_played: 0,
        battle_streak: 0,
        best_streak: 0,
      }).eq('id', targetId)
      await audit()
      return NextResponse.json({ ok: true, action: 'stats_reset' })
    }

    default:
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }
}
