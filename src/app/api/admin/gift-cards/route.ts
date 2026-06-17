import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

// POST — send cards to a user
export async function POST(req: NextRequest) {
  const admin_user = await checkAdmin()
  if (!admin_user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, cardIds, reason } = await req.json() as {
    userId: string
    cardIds: string[]
    reason?: string
  }

  if (!userId || !Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: 'userId et cardIds requis' }, { status: 400 })
  }
  if (cardIds.length > 20) {
    return NextResponse.json({ error: 'Maximum 20 cartes à la fois' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify user exists
  const { data: target, error: userErr } = await admin
    .from('users')
    .select('id, pseudo')
    .eq('id', userId)
    .single()

  if (userErr || !target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  // Verify all cards exist
  const { data: cards } = await admin
    .from('cards')
    .select('id, name, rarity')
    .in('id', cardIds)

  if (!cards || cards.length !== cardIds.length) {
    return NextResponse.json({ error: 'Une ou plusieurs cartes introuvables' }, { status: 404 })
  }

  // Insert cards into user's collection
  const { error: insertErr } = await admin.from('user_cards').insert(
    cardIds.map((cardId) => ({
      user_id: userId,
      card_id: cardId,
      obtained_via: 'admin_gift',
    }))
  )

  if (insertErr) {
    console.error('[gift-cards] insert failed:', insertErr)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi' }, { status: 500 })
  }

  // Log the gift (best-effort, table may not exist yet)
  try {
    await admin.from('admin_gifts').insert({
      admin_id: admin_user.id,
      recipient_id: userId,
      card_ids: cardIds,
      reason: reason ?? null,
    })
  } catch { /* ignore */ }

  // Push notification to recipient
  const label = cards.length === 1
    ? `🎁 Tu as reçu la carte ${cards[0].name} !`
    : `🎁 Tu as reçu ${cards.length} cartes !`

  try {
    await sendPushToUser(userId, {
      title: '🎁 Cadeau de l\'admin !',
      body: label + (reason ? ` — ${reason}` : ''),
      url: '/collection',
      tag: `gift-${Date.now()}`,
    })
  } catch { /* push is best-effort */ }

  return NextResponse.json({ ok: true, sent: cards.length })
}

// GET — search users or cards
export async function GET(req: NextRequest) {
  const admin_user = await checkAdmin()
  if (!admin_user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const q = searchParams.get('q') ?? ''

  const admin = createAdminClient()

  if (type === 'users') {
    const { data } = await admin
      .from('users')
      .select('id, pseudo, nation, photo_url')
      .ilike('pseudo', `%${q}%`)
      .order('pseudo')
      .limit(10)
    return NextResponse.json(data ?? [])
  }

  if (type === 'cards') {
    let query = admin
      .from('cards')
      .select('id, name, rarity, image_url, nation, type')
      .order('rarity', { ascending: false })
      .order('name')
      .limit(20)

    if (q) query = query.ilike('name', `%${q}%`)
    const { data } = await query
    return NextResponse.json(data ?? [])
  }

  return NextResponse.json({ error: 'type requis: users | cards' }, { status: 400 })
}
