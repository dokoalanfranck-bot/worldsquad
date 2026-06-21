import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ? user : null
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData invalide' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const matchId = (formData.get('match_id') as string | null) ?? ''

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|ogv|mov|avi|mkv)$/i)) {
    return NextResponse.json({ error: 'Format vidéo non supporté (mp4, webm, mov, avi)' }, { status: 400 })
  }

  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 100 Mo)' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Créer le bucket s'il n'existe pas, ou s'assurer qu'il est public
  const { error: bucketError } = await admin.storage.createBucket('highlights', {
    public: true,
    allowedMimeTypes: allowedTypes,
    fileSizeLimit: 104857600,
  })
  if (bucketError) {
    if (bucketError.message.includes('already exists') || bucketError.message.includes('Duplicate')) {
      // Bucket existe déjà — forcer public au cas où il a été créé en privé
      await admin.storage.updateBucket('highlights', { public: true })
    } else {
      console.warn('[highlights bucket]', bucketError.message)
    }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `videos/${Date.now()}_${safeName}`
  const arrayBuffer = await file.arrayBuffer()

  const { data: uploaded, error: uploadError } = await admin.storage
    .from('highlights')
    .upload(path, arrayBuffer, {
      contentType: file.type || 'video/mp4',
      upsert: false,
    })

  if (uploadError || !uploaded) {
    return NextResponse.json({ error: uploadError?.message ?? 'Erreur upload' }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('highlights').getPublicUrl(uploaded.path)

  const { data: highlight, error: dbError } = await admin
    .from('highlights')
    .insert({ title, video_url: urlData.publicUrl, match_id: matchId || null })
    .select('id')
    .single()

  if (dbError) {
    await admin.storage.from('highlights').remove([uploaded.path])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ id: highlight.id })
}
