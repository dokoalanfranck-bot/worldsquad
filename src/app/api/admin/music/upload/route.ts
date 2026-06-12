import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData invalide' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const trackName = (formData.get('name') as string | null) ?? ''
  const trackType = (formData.get('type') as string | null) ?? 'ambiance'

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (!['ambiance', 'pack_opening'].includes(trackType)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  const allowedTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/mp4', 'audio/x-m4a']
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|ogg|wav|aac|m4a)$/i)) {
    return NextResponse.json({ error: 'Format audio non supporté (mp3, ogg, wav, aac, m4a)' }, { status: 400 })
  }

  if (file.size > 30 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 30 MB)' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Créer le bucket si nécessaire
  const { error: bucketError } = await admin.storage.createBucket('music', {
    public: true,
    allowedMimeTypes: allowedTypes,
    fileSizeLimit: 31457280,
  })
  // Ignorer l'erreur si le bucket existe déjà
  if (bucketError && !bucketError.message.includes('already exists') && !bucketError.message.includes('Duplicate')) {
    console.warn('[music bucket]', bucketError.message)
  }

  // Upload vers Supabase Storage
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${trackType}/${Date.now()}_${safeName}`
  const arrayBuffer = await file.arrayBuffer()

  const { data: uploaded, error: uploadError } = await admin.storage
    .from('music')
    .upload(path, arrayBuffer, {
      contentType: file.type || 'audio/mpeg',
      upsert: false,
    })

  if (uploadError || !uploaded) {
    return NextResponse.json({ error: uploadError?.message ?? 'Erreur upload' }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('music').getPublicUrl(uploaded.path)
  const publicUrl = urlData.publicUrl

  // Sauvegarder les métadonnées en DB
  const name = trackName.trim() || file.name.replace(/\.[^.]+$/, '')
  const { data: track, error: dbError } = await admin
    .from('music_tracks')
    .insert({
      name,
      file_name: file.name,
      url: publicUrl,
      type: trackType,
      active: false,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (dbError) {
    // Nettoyer le fichier uploadé si l'insert DB échoue
    await admin.storage.from('music').remove([uploaded.path])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ track })
}
