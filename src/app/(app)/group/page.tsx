import { createClient } from '@/lib/supabase/server'
import { GroupClient } from './GroupClient'
import Link from 'next/link'

export default async function GroupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('group_members')
    .select('group:groups(*)')
    .eq('user_id', user!.id)
    .single()

  if (!membership?.group) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          MON GROUPE
        </h1>
        <div className="glass rounded-2xl p-8">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-white font-bold text-lg mb-2">Tu n&apos;es dans aucun groupe</p>
          <p className="text-gray-500 text-sm mb-6">Crée un groupe ou rejoins celui d&apos;un ami</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/settings"
              className="bg-[#F5C518] text-black font-black px-6 py-3 rounded-xl hover:bg-[#ffd700] transition-colors"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              GÉRER MON GROUPE
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const group = membership.group as unknown as { id: string; name: string; code: string; creator_id: string | null }

  const [{ data: members }, { data: activities }] = await Promise.all([
    supabase
      .from('group_members')
      .select('user:users(id, pseudo, photo_url, nation, coins, predictions_correct, battles_won, card_image_url)')
      .eq('group_id', group.id),
    supabase
      .from('group_activities')
      .select('*, user:users(pseudo, photo_url)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  type MemberUser = { id: string; pseudo: string; photo_url: string | null; nation: string; coins: number; predictions_correct: number; battles_won: number; card_image_url: string | null }

  const leaderboard = (members ?? [])
    .map((m) => m.user as unknown as MemberUser | null)
    .filter((u): u is MemberUser => u !== null)
    .sort((a, b) => (b.coins ?? 0) - (a.coins ?? 0))

  return (
    <GroupClient
      group={group}
      leaderboard={leaderboard}
      activities={activities ?? []}
      currentUserId={user!.id}
    />
  )
}
