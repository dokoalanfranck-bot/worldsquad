import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', authUser.id).single()
  if (!profile?.is_admin) return null
  return authUser
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: matchId } = await params
  const admin = createAdminClient()
  const body = await req.json()
  const { _trigger_calculate, _scorer, ...dbFields } = body

  // Charger l'état actuel du match avant la mise à jour
  const { data: current } = await admin
    .from('matches')
    .select('team_a, team_b, flag_a, flag_b, score_a, score_b, status')
    .eq('id', matchId)
    .single()

  // Mise à jour DB
  let data: Record<string, unknown> | null = null
  if (Object.keys(dbFields).length > 0) {
    const { data: updated, error } = await admin
      .from('matches')
      .update(dbFields)
      .eq('id', matchId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    data = updated
  }

  // Push notifications automatiques
  if (current) {
    const fa = current.flag_a ?? ''
    const fb = current.flag_b ?? ''
    const ta = current.team_a
    const tb = current.team_b
    const newScoreA = dbFields.score_a ?? current.score_a ?? 0
    const newScoreB = dbFields.score_b ?? current.score_b ?? 0

    const statusChanged = dbFields.status && dbFields.status !== current.status
    const goalA = dbFields.score_a !== undefined && dbFields.score_a > (current.score_a ?? 0)
    const goalB = dbFields.score_b !== undefined && dbFields.score_b > (current.score_b ?? 0)

    try {
      if (statusChanged && dbFields.status === 'live') {
        await sendPushToAll({
          title: `⚽ EN DIRECT — ${fa} ${ta} vs ${tb} ${fb}`,
          body: 'Le match vient de commencer ! Suivez le score en direct',
          url: '/dashboard',
          tag: `live-${matchId}`,
        })
      } else if (goalA || goalB) {
        const scoringTeam = goalA ? ta : tb
        const scorerLine = _scorer ? `⚽ ${_scorer} (${scoringTeam})` : `⚽ But pour ${scoringTeam} !`
        await sendPushToAll({
          title: `${fa} ${ta} ${newScoreA} — ${newScoreB} ${tb} ${fb}`,
          body: scorerLine,
          url: '/dashboard',
          tag: `goal-${matchId}-${Date.now()}`,
        })
      } else if (statusChanged && dbFields.status === 'finished') {
        const winner = newScoreA > newScoreB ? ta : newScoreB > newScoreA ? tb : null
        await sendPushToAll({
          title: `🏁 ${fa} ${ta} ${newScoreA} — ${newScoreB} ${tb} ${fb}`,
          body: winner ? `Victoire de ${winner} ! Vérifiez vos pronostics` : 'Match nul ! Vérifiez vos pronostics',
          url: '/dashboard',
          tag: `finished-${matchId}`,
        })
      }
    } catch (e) {
      console.warn('[push auto]', e)
    }
  }

  // Calcul des pronostics si demandé
  if (_trigger_calculate || new URL(req.url).searchParams.get('calculate') === 'true') {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await fetch(`${baseUrl}/api/admin/calculate-match/${matchId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    }).catch(() => {})
  }

  return NextResponse.json(data ?? { success: true })
}
