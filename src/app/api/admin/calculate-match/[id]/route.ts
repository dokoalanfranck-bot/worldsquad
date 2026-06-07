import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Protected admin endpoint — call manually after each match finishes
// Usage: POST /api/admin/calculate-match/[matchId]
// Header: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const matchId = params.id

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!match || match.status !== 'finished' || match.score_a === null) {
    return NextResponse.json({ error: 'Match not finished or scores missing' }, { status: 400 })
  }

  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('match_id', matchId)
    .eq('status', 'pending')

  if (!predictions?.length) {
    return NextResponse.json({ message: 'No pending predictions', updated: 0 })
  }

  const actualWinner =
    match.score_a > match.score_b ? 'a' : match.score_b > match.score_a ? 'b' : 'draw'

  const updates = predictions.map((pred) => {
    const predWinner =
      pred.pred_score_a > pred.pred_score_b
        ? 'a'
        : pred.pred_score_b > pred.pred_score_a
        ? 'b'
        : 'draw'

    const isExact =
      pred.pred_score_a === match.score_a && pred.pred_score_b === match.score_b
    const isCorrectWinner = !isExact && predWinner === actualWinner

    const status = isExact
      ? 'correct_score'
      : isCorrectWinner
      ? 'correct_winner'
      : 'wrong'

    const coinsWon = isExact ? 300 : isCorrectWinner ? 100 : 0

    return { ...pred, status, coins_won: coinsWon }
  })

  // Batch update predictions
  await Promise.all(
    updates.map((u) =>
      supabase
        .from('predictions')
        .update({ status: u.status, coins_won: u.coins_won })
        .eq('id', u.id)
    )
  )

  // Credit coins to winners
  const winners = updates.filter((u) => u.coins_won > 0)
  await Promise.all(
    winners.map((u) =>
      Promise.all([
        supabase.rpc('increment_coins', { user_id: u.user_id, delta: u.coins_won }),
        supabase.from('coin_transactions').insert({
          user_id: u.user_id,
          amount: u.coins_won,
          reason: `Pronostic ${u.status === 'correct_score' ? 'score exact' : 'bon vainqueur'} — match ${matchId.slice(0, 8)}`,
        }),
        supabase.rpc('increment_predictions_correct', { user_id: u.user_id }),
      ])
    )
  )

  return NextResponse.json({
    message: 'Predictions calculated',
    updated: updates.length,
    winners: winners.length,
    totalCoinsDistributed: winners.reduce((sum, u) => sum + u.coins_won, 0),
  })
}
