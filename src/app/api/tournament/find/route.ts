import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { launchSemis } from '@/lib/launch-semis'
import { isFeatureEnabled } from '@/lib/feature-flags'


const JOIN_WINDOW_SECONDS = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifiÃ©' }, { status: 401 })

  if (!await isFeatureEnabled('tournaments_enabled')) {
    return NextResponse.json({ error: 'Le mode Tournoi est temporairement dÃ©sactivÃ©' }, { status: 503 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users')
    .select('pseudo, nation, is_admin')
    .eq('id', user.id)
    .single()
  if (!profile)     return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  if (profile.is_admin) return NextResponse.json({ error: 'Les comptes admin ne peuvent pas participer' }, { status: 403 })

  // EmpÃªcher de rejoindre un nouveau tournoi si dÃ©jÃ  dans un tournoi actif
  const { data: alreadyIn } = await admin
    .from('tournaments')
    .select('id')
    .in('status', ['waiting', 'semi_active', 'final_active'])
    .or(`p0_id.eq.${user.id},p1_id.eq.${user.id},p2_id.eq.${user.id},p3_id.eq.${user.id}`)
    .maybeSingle()
  if (alreadyIn) return NextResponse.json({ tournamentId: alreadyIn.id })

  // Chercher un tournoi en attente avec une place libre
  const now = new Date().toISOString()
  const { data: openList } = await admin
    .from('tournaments')
    .select('id, p0_id, p0_pseudo, p0_nation, p1_id, p1_pseudo, p1_nation, p2_id, p2_pseudo, p2_nation, p3_id, p3_pseudo, p3_nation')
    .eq('status', 'waiting')
    .gt('join_deadline', now)
    .limit(5)

  for (const t of openList ?? []) {
    for (const slot of [1, 2, 3] as const) {
      const idKey     = `p${slot}_id`     as keyof typeof t
      const pseudoKey = `p${slot}_pseudo` as keyof typeof t
      const nationKey = `p${slot}_nation` as keyof typeof t
      if (t[idKey] !== null) continue

      // Claim atomique : Ã©choue si un autre joueur a pris le slot ou si la deadline a expirÃ©
      const { data: claimed } = await admin
        .from('tournaments')
        .update({ [idKey]: user.id, [pseudoKey]: profile.pseudo, [nationKey]: profile.nation })
        .eq('id', t.id)
        .is(idKey, null)
        .eq('status', 'waiting')
        .gt('join_deadline', new Date().toISOString()) // vÃ©rification deadline dans le UPDATE
        .select('id, p0_id, p0_pseudo, p0_nation, p1_id, p1_pseudo, p1_nation, p2_id, p2_pseudo, p2_nation, p3_id, p3_pseudo, p3_nation')
        .maybeSingle()

      if (!claimed) continue

      // VÃ©rifier si les 4 slots sont remplis â†’ lancer les demi-finales
      if (claimed.p0_id && claimed.p1_id && claimed.p2_id && claimed.p3_id) {
        try {
          await launchSemis(admin, claimed)
        } catch (err) {
          console.error('[tournament/find] launchSemis failed:', err)
          // Le tournoi est complet mais les semis n'ont pas pu dÃ©marrer.
          // Le bouton "ComplÃ©ter et lancer" servira de fallback.
        }
      }
      return NextResponse.json({ tournamentId: t.id })
    }
  }

  // CrÃ©er un nouveau tournoi
  const deadline = new Date(Date.now() + JOIN_WINDOW_SECONDS * 1000).toISOString()
  const { data: newT, error } = await admin.from('tournaments').insert({
    p0_id:         user.id,
    p0_pseudo:     profile.pseudo,
    p0_nation:     profile.nation,
    status:        'waiting',
    join_deadline: deadline,
    coins_won:     0,
  }).select('id').single()

  if (error || !newT) return NextResponse.json({ error: 'Erreur crÃ©ation tournoi' }, { status: 500 })
  return NextResponse.json({ tournamentId: newT.id })
}

