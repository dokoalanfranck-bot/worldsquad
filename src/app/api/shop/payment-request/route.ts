import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

const COINS_PER_PACK: Record<string, { coins: number; name: string }> = {
  starter: { coins: 1000, name: 'Pack Starter' },
  fan:     { coins: 3000, name: 'Pack Fan' },
  ultra:   { coins: 8000, name: 'Pack Ultra' },
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const formData = await req.formData()
  const packType      = formData.get('pack_type') as string
  const phoneNumber   = formData.get('phone_number') as string
  const paymentMethod = (formData.get('payment_method') as string) ?? 'orange_money'
  const file          = formData.get('screenshot') as File | null

  if (!packType || !COINS_PER_PACK[packType]) {
    return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })
  }
  if (!phoneNumber?.trim()) {
    return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Capture d\'écran requise' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get pack price
  const { data: config } = await admin.from('shop_config').select('prices_fcfa, is_active').limit(1).single()
  if (!config?.is_active) {
    return NextResponse.json({ error: 'Boutique temporairement fermée' }, { status: 503 })
  }
  const prices = config.prices_fcfa as Record<string, number>
  const amountFcfa = prices[packType] ?? 0

  // Upload screenshot to Supabase Storage
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { data: upload, error: uploadErr } = await admin.storage
    .from('payment-screenshots')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadErr || !upload) {
    console.error('[payment-request] upload error:', uploadErr)
    return NextResponse.json({ error: 'Erreur upload capture d\'écran' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('payment-screenshots').getPublicUrl(upload.path)

  const pack = COINS_PER_PACK[packType]

  // Insert payment request
  const { data: pr, error: prErr } = await admin.from('payment_requests').insert({
    user_id:         user.id,
    pack_type:       packType,
    pack_name:       pack.name,
    amount_fcfa:     amountFcfa,
    coins_to_credit: pack.coins,
    phone_number:    phoneNumber.trim(),
    screenshot_url:  publicUrl,
    payment_method:  paymentMethod,
    status:          'pending',
  }).select('id').single()

  if (prErr || !pr) {
    console.error('[payment-request] insert error:', prErr)
    return NextResponse.json({ error: 'Erreur création demande' }, { status: 500 })
  }

  // Notify all admins via push
  const { data: admins } = await admin.from('users').select('id').eq('is_admin', true)
  const { data: userInfo } = await admin.from('users').select('pseudo').eq('id', user.id).single()

  await Promise.allSettled(
    (admins ?? []).map((a) =>
      sendPushToUser(a.id, {
        title: '💳 Nouvelle demande de paiement',
        body: `${userInfo?.pseudo ?? 'Un joueur'} a soumis un paiement pour ${pack.name} (${amountFcfa.toLocaleString('fr-FR')} FCFA)`,
        url: '/admin/shop',
        tag: 'payment-request',
      })
    )
  )

  return NextResponse.json({ success: true, id: pr.id })
}
