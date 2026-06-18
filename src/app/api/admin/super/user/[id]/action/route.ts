import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Action = 'ban' | 'unban' | 'add_coins' | 'remove_coins' | 'make_admin' | 'remove_admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('is_super_admin').eq('id', user.id).single()
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent self-modification
  if (targetId === user.id) return NextResponse.json({ error: 'Impossible de modifier son propre compte' }, { status: 400 })

  const { action, amount, reason } = await req.json() as { action: Action; amount?: number; reason?: string }

  switch (action) {
    case 'ban': {
      await admin.from('users').update({ is_banned: true, ban_reason: reason ?? null }).eq('id', targetId)
      // Disable the auth account
      await admin.auth.admin.updateUserById(targetId, { ban_duration: '876600h' })
      return NextResponse.json({ ok: true, action: 'banned' })
    }

    case 'unban': {
      await admin.from('users').update({ is_banned: false, ban_reason: null }).eq('id', targetId)
      await admin.auth.admin.updateUserById(targetId, { ban_duration: 'none' })
      return NextResponse.json({ ok: true, action: 'unbanned' })
    }

    case 'add_coins': {
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
      await admin.rpc('increment_coins', { user_id: targetId, delta: amount })
      await admin.from('coin_transactions').insert({ user_id: targetId, amount, reason: `🔧 Admin grant — ${reason ?? 'Super admin action'}` })
      return NextResponse.json({ ok: true, action: 'coins_added', amount })
    }

    case 'remove_coins': {
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
      await admin.rpc('increment_coins', { user_id: targetId, delta: -amount })
      await admin.from('coin_transactions').insert({ user_id: targetId, amount: -amount, reason: `🔧 Admin deduct — ${reason ?? 'Super admin action'}` })
      return NextResponse.json({ ok: true, action: 'coins_removed', amount })
    }

    case 'make_admin': {
      await admin.from('users').update({ is_admin: true }).eq('id', targetId)
      return NextResponse.json({ ok: true, action: 'made_admin' })
    }

    case 'remove_admin': {
      await admin.from('users').update({ is_admin: false }).eq('id', targetId)
      return NextResponse.json({ ok: true, action: 'admin_removed' })
    }

    default:
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }
}
