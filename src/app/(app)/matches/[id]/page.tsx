import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MatchDetailClient } from './MatchDetailClient'
import { getFlashChallengeForMatch } from '@/lib/flash-challenges'

interface Props {
  params: { id: string }
}

export default async function MatchDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch match first to know the teams
  const { data: match } = await supabase.from('matches').select('*').eq('id', params.id).single()
  if (!match) notFound()

  const [{ data: prediction }, { data: groupPredictions }, flashChallenge, { data: players }] = await Promise.all([
    supabase
      .from('predictions')
      .select('*')
      .eq('match_id', params.id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('predictions')
      .select('*, user:users(pseudo, photo_url, nation)')
      .eq('match_id', params.id),
    getFlashChallengeForMatch(params.id),
    supabase
      .from('cards')
      .select('id, name, rarity, image_url, stats, nation')
      .eq('type', 'player')
      .in('nation', [match.team_a, match.team_b])
      .order('name'),
  ])

  // Only show others' predictions after match starts
  const visibleGroupPredictions =
    match.status !== 'upcoming' ? groupPredictions ?? [] : []

  return (
    <MatchDetailClient
      match={match}
      currentPrediction={prediction}
      groupPredictions={visibleGroupPredictions}
      userId={user!.id}
      flashChallenge={flashChallenge}
      players={players ?? []}
    />
  )
}
