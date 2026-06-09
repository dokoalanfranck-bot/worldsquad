import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: users } = await supabase
    .from('users')
    .select('id, pseudo, daily_streak')
    .or(`daily_reward_claimed_at.is.null,daily_reward_claimed_at.lt.${yesterday}`)
    .gt('daily_streak', 0)

  if (!users || users.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  await Promise.allSettled(
    (users as { id: string; pseudo: string; daily_streak: number }[]).map((u) =>
      sendPushToUser(u.id, {
        title: '🔥 Garde ta série !',
        body: `${u.pseudo}, ta série de ${u.daily_streak} jour${u.daily_streak > 1 ? 's' : ''} t'attend. Réclame ta récompense !`,
        tag: 'daily-reward',
        url: '/dashboard',
      }).then(() => { sent++ })
    )
  )

  return NextResponse.json({ sent })
}
