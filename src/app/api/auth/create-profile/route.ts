import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'


export async function POST(req: NextRequest) {
  try {
    const { userId, email, pseudo, nation, photoUrl, cardImageUrl } = await req.json()

    if (!userId || !email || !pseudo || !nation) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the user actually exists in auth.users before inserting
    const { data: authUser, error: authCheckError } = await supabase.auth.admin.getUserById(userId)
    if (authCheckError || !authUser?.user) {
      return NextResponse.json(
        { error: 'Compte non crÃ©Ã© â€” vÃ©rifie tes emails ou rÃ©essaie' },
        { status: 400 }
      )
    }

    // Upsert profile (handles re-attempts gracefully)
    const { error: profileError } = await supabase.from('users').upsert(
      {
        id: userId,
        email,
        pseudo,
        photo_url: photoUrl ?? null,
        card_image_url: cardImageUrl ?? null,
        nation,
        coins: 500,
        level: 'Rookie',
        card_rarity: 'Common',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Credit signup coins (only if profile was just created)
    await supabase.from('coin_transactions').upsert(
      { user_id: userId, amount: 500, reason: 'Bonus inscription' },
      { onConflict: 'user_id,reason', ignoreDuplicates: true }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('create-profile error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
