import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBotName, botNation } from '@/lib/duel-engine'
import { launchSemis } from '@/lib/launch-semis'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: t } = await admin
    .from('tournaments')
    .select('id, status, p0_id, p0_pseudo, p0_nation, p1_id, p1_pseudo, p1_nation, p2_id, p2_pseudo, p2_nation, p3_id, p3_pseudo, p3_nation')
    .eq('id', id)
    .single()

  if (!t)                  return NextResponse.json({ error: 'Tournoi introuvable' }, { status: 404 })
  if (t.p0_id !== user.id) return NextResponse.json({ error: 'Seul le créateur peut démarrer' }, { status: 403 })
  if (t.status !== 'waiting') return NextResponse.json({ error: 'Tournoi déjà démarré' }, { status: 400 })

  // Remplir les slots vides avec des bots
  const filled = { ...t }
  const botUpdates: Record<string, string> = {}

  for (const slot of [1, 2, 3] as const) {
    const idKey = `p${slot}_id` as keyof typeof filled
    if (!filled[idKey]) {
      const pseudo = randomBotName()
      const nation = botNation(pseudo)
      filled[`p${slot}_pseudo` as keyof typeof filled] = pseudo as never
      filled[`p${slot}_nation` as keyof typeof filled] = nation as never
      botUpdates[`p${slot}_pseudo`] = pseudo
      botUpdates[`p${slot}_nation`] = nation
    }
  }

  if (Object.keys(botUpdates).length > 0) {
    await admin.from('tournaments').update(botUpdates).eq('id', id)
  }

  await launchSemis(admin, filled as typeof t)
  return NextResponse.json({ ok: true })
}
