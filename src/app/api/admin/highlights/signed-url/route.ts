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

  const { fileName, contentType } = await req.json() as { fileName: string; contentType: string }

  if (!fileName || !contentType) {
    return NextResponse.json({ error: 'fileName et contentType requis' }, { status: 400 })
  }

  if (!contentType.startsWith('video/')) {
    return NextResponse.json({ error: 'Seules les vidéos sont acceptées' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Créer le bucket highlights s'il n'existe pas
  const { error: bucketError } = await admin.storage.createBucket('highlights', {
    public: true,
    fileSizeLimit: 524288000, // 500 MB
  })
  if (bucketError && !bucketError.message.includes('already exists') && !bucketError.message.includes('Duplicate')) {
    console.warn('[highlights bucket]', bucketError.message)
  }

  // Générer le chemin unique dans le bucket
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `videos/${Date.now()}_${safeName}`

  // Créer une URL signée pour l'upload direct depuis le navigateur
  const { data: signData, error: signError } = await admin.storage
    .from('highlights')
    .createSignedUploadUrl(path)

  if (signError || !signData) {
    return NextResponse.json({ error: signError?.message ?? 'Erreur création URL signée' }, { status: 500 })
  }

  // URL publique que l'on pourra stocker en DB après upload
  const { data: urlData } = admin.storage.from('highlights').getPublicUrl(path)

  return NextResponse.json({
    signedUrl: signData.signedUrl,
    path,
    publicUrl: urlData.publicUrl,
  })
}
