import { createClient } from '@/lib/supabase/server'
import { NewBattleClient } from './NewBattleClient'
import Link from 'next/link'

export default async function NewBattlePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's profile + coins
  const { data: profile } = await supabase.from('users').select('coins').eq('id', user!.id).single()

  // Get group members (potential opponents)
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user!.id)
    .single()

  let groupMembers: { id: string; pseudo: string; photo_url: string | null; nation: string }[] = []
  if (membership) {
    const { data: members } = await supabase
      .from('group_members')
      .select('user:users(id, pseudo, photo_url, nation)')
      .eq('group_id', membership.group_id)
      .neq('user_id', user!.id)
    groupMembers = (members ?? []).map((m) => m.user as unknown as typeof groupMembers[0]).filter(Boolean)
  }

  // Get user's cards
  const { data: userCards } = await supabase
    .from('user_cards')
    .select('card:cards(*)')
    .eq('user_id', user!.id)

  const myCards = (userCards ?? []).map((uc) => uc.card).filter(Boolean)

  if (groupMembers.length === 0) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          NOUVEAU BATTLE
        </h1>
        <div className="glass rounded-2xl p-8">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-white font-bold mb-2">Tu dois être dans un groupe pour défier quelqu&apos;un</p>
          <Link href="/group" className="text-[#F5C518] font-bold hover:underline">
            Rejoindre un groupe →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <NewBattleClient
      groupMembers={groupMembers}
      myCards={myCards as unknown as Parameters<typeof NewBattleClient>[0]['myCards']}
      maxCoins={profile?.coins ?? 0}
      currentUserId={user!.id}
    />
  )
}
