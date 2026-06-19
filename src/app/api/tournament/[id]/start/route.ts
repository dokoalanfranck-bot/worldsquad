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
  if (t.status !== 'waiting') return NextResponse.json({ ok: true }) // déjà démarré, idempotent

  // Préparer les noms de bots pour les slots vides
  const botUpdates: Record<string, string> = {}
  const filledPseudos: Record<string, string> = {}
  const filledNations: Record<string, string> = {}

  for (const slot of [1, 2, 3] as const) {
    const idKey = `p${slot}_id` as keyof typeof t
    if (!t[idKey]) {
      const pseudo = randomBotName()
      const nation = botNation(pseudo)
      botUpdates[`p${slot}_pseudo`] = pseudo
      botUpdates[`p${slot}_nation`] = nation
      filledPseudos[slot] = pseudo
      filledNations[slot] = nation
    }
  }

  // Transition atomique : 'waiting' → 'semi_active' avec noms des bots
  // Si deux requêtes arrivent en même temps, une seule réussit ce UPDATE
  const { data: locked } = await admin
    .from('tournaments')
    .update({ status: 'semi_active', ...botUpdates })
    .eq('id', id)
    .eq('status', 'waiting') // condition atomique — échoue si déjà changé
    .select('id, p0_id, p0_pseudo, p0_nation, p1_id, p1_pseudo, p1_nation, p2_id, p2_pseudo, p2_nation, p3_id, p3_pseudo, p3_nation')
    .maybeSingle()

  if (!locked) {
    // Une autre requête a déjà lancé le tournoi → idempotent
    return NextResponse.json({ ok: true })
  }

  // Lancer les demi-finales avec les données complètes (IDs + noms bots)
  try {
    await launchSemis(admin, locked)
  } catch (err) {
    console.error('[tournament/start] launchSemis failed:', err)
    return NextResponse.json({ error: 'Erreur lors du lancement des demi-finales' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
