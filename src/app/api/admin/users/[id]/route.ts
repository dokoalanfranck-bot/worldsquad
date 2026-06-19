import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'


async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', authUser.id)
    .single()

  if (!profile?.is_admin) return null
  return authUser
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin_user = await checkAdmin()
  if (!admin_user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const body = await req.json() as {
    coins_delta?: number
    is_vip?: boolean
    is_admin?: boolean
    pseudo?: string
    coins?: number
    predictions_correct?: number
    battles_won?: number
  }

  const updateData: Record<string, unknown> = {}

  if (body.coins_delta !== undefined) {
    // Get current coins
    const { data: current } = await admin
      .from('users')
      .select('coins')
      .eq('id', params.id)
      .single()

    const newCoins = (current?.coins ?? 0) + body.coins_delta
    updateData.coins = newCoins

    // Insert coin transaction
    await admin.from('coin_transactions').insert({
      user_id: params.id,
      amount: body.coins_delta,
      reason: `Ajustement admin (${body.coins_delta > 0 ? '+' : ''}${body.coins_delta})`,
    })
  } else if (body.coins !== undefined) {
    updateData.coins = body.coins
    await admin.from('coin_transactions').insert({
      user_id: params.id,
      amount: body.coins,
      reason: 'Définition directe admin',
    })
  }

  if (body.is_vip !== undefined) updateData.is_vip = body.is_vip
  if (body.is_admin !== undefined) updateData.is_admin = body.is_admin
  if (body.pseudo !== undefined) updateData.pseudo = body.pseudo
  if (body.predictions_correct !== undefined) updateData.predictions_correct = body.predictions_correct
  if (body.battles_won !== undefined) updateData.battles_won = body.battles_won

  const { data, error } = await admin
    .from('users')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin_user = await checkAdmin()
  if (!admin_user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Delete from users table first (cascade should handle related records)
  const { error: dbError } = await admin.from('users').delete().eq('id', params.id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Delete from Supabase auth
  const { error: authError } = await admin.auth.admin.deleteUser(params.id)
  if (authError) {
    // Log but don't fail — DB record already deleted
    console.error('Auth delete error:', authError.message)
  }

  return NextResponse.json({ success: true })
}
