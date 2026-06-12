import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

// PATCH — activer / renommer une piste
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as { active?: boolean; name?: string }
  const admin = createAdminClient()

  if (body.active === true) {
    // Récupérer le type de la piste
    const { data: track } = await admin.from('music_tracks').select('type').eq('id', id).single()
    if (!track) return NextResponse.json({ error: 'Piste introuvable' }, { status: 404 })

    // Désactiver toutes les pistes du même type, activer celle-ci
    await admin.from('music_tracks').update({ active: false }).eq('type', track.type)
    await admin.from('music_tracks').update({ active: true }).eq('id', id)
  } else if (body.active === false) {
    await admin.from('music_tracks').update({ active: false }).eq('id', id)
  }

  if (body.name) {
    await admin.from('music_tracks').update({ name: body.name }).eq('id', id)
  }

  const { data: updated } = await admin.from('music_tracks').select('*').eq('id', id).single()
  return NextResponse.json({ track: updated })
}

// DELETE — supprimer une piste
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: track } = await admin.from('music_tracks').select('url, file_name').eq('id', id).single()
  if (!track) return NextResponse.json({ error: 'Piste introuvable' }, { status: 404 })

  // Supprimer le fichier du storage (extraire le path depuis l'URL)
  try {
    const url = new URL(track.url)
    const pathParts = url.pathname.split('/music/')
    if (pathParts[1]) {
      await admin.storage.from('music').remove([decodeURIComponent(pathParts[1])])
    }
  } catch { /* Ignore storage cleanup errors */ }

  await admin.from('music_tracks').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
