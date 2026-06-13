import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { creditCoins } from '@/lib/coins'
import { getFlashChallengeForMatch } from '@/lib/flash-challenges'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await req.json() as { matchId?: string }
  if (!matchId) return NextResponse.json({ error: 'matchId requis' }, { status: 400 })

  const challenge = await getFlashChallengeForMatch(matchId)
  if (!challenge) return NextResponse.json({ active: false })

  const admin = createAdminClient()

  // Check if user already claimed this challenge bonus
  const { data: existing } = await admin
    .from('flash_challenge_claims')
    .select('id')
    .eq('user_id', user.id)
    .eq('challenge_id', challenge.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ active: true, alreadyClaimed: true })

  // Record claim first (prevent double credit on retry)
  const { error: claimError } = await admin.from('flash_challenge_claims').insert({
    user_id: user.id,
    challenge_id: challenge.id,
  })

  if (claimError) {
    // Race condition — already claimed
    return NextResponse.json({ active: true, alreadyClaimed: true })
  }

  await creditCoins(user.id, challenge.bonus_coins, `⚡ Défi Flash : ${challenge.label}`)

  return NextResponse.json({ active: true, alreadyClaimed: false, coins: challenge.bonus_coins })
}
