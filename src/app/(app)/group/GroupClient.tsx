'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { GroupActivity } from '@/types'

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾', Italy: '🇮🇹',
  USA: '🇺🇸', Mexico: '🇲🇽', Canada: '🇨🇦', Morocco: '🇲🇦',
  Japan: '🇯🇵', Senegal: '🇸🇳', Switzerland: '🇨🇭', Denmark: '🇩🇰',
}

interface Member {
  id: string
  pseudo: string
  photo_url: string | null
  nation: string
  coins: number
  predictions_correct: number
  battles_won: number
  card_image_url: string | null
}

interface Props {
  group: { id: string; name: string; code: string; creator_id: string | null }
  leaderboard: Member[]
  activities: (GroupActivity & { user: { pseudo: string; photo_url: string | null } | null })[]
  currentUserId: string
}

export function GroupClient({ group, leaderboard, activities: initialActivities, currentUserId }: Props) {
  const [activities, setActivities] = useState(initialActivities)
  const supabase = createClient()

  // Realtime activity subscription
  useEffect(() => {
    const channel = supabase
      .channel(`group-feed-${group.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_activities', filter: `group_id=eq.${group.id}` },
        (payload) => {
          setActivities((prev) => [payload.new as typeof initialActivities[0], ...prev].slice(0, 30))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [group.id, supabase, initialActivities])

  function copyInviteLink() {
    const msg = `Rejoins-moi sur WorldSquad pour la Coupe du Monde !\nEntre le code ${group.code} sur worldsquad.app 🏆⚽`
    navigator.clipboard.writeText(msg)
    toast.success('Lien copié dans le presse-papier !')
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Rejoins-moi sur WorldSquad pour la Coupe du Monde !\nEntre le code ${group.code} sur worldsquad.app 🏆⚽`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {group.name.toUpperCase()}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-gray-500 text-sm">Code d&apos;invitation :</span>
            <code className="bg-white/10 text-[#F5C518] font-black text-lg px-3 py-0.5 rounded-lg tracking-widest">
              {group.code}
            </code>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyInviteLink}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm font-semibold transition-colors"
          >
            📋 Copier
          </button>
          <button
            onClick={shareWhatsApp}
            className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm font-semibold transition-colors"
          >
            📱 WhatsApp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            CLASSEMENT ({leaderboard.length} membres)
          </h2>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-gray-500 font-bold uppercase px-4 py-3">Rang</th>
                  <th className="text-left text-xs text-gray-500 font-bold uppercase px-4 py-3">Joueur</th>
                  <th className="text-right text-xs text-gray-500 font-bold uppercase px-4 py-3">Coins</th>
                  <th className="text-right text-xs text-gray-500 font-bold uppercase px-4 py-3 hidden sm:table-cell">Pronos</th>
                  <th className="text-right text-xs text-gray-500 font-bold uppercase px-4 py-3 hidden sm:table-cell">Battles</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((member, i) => {
                  const isMe = member.id === currentUserId
                  const flag = NATION_FLAGS[member.nation] ?? '🌍'
                  return (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`border-b border-white/3 last:border-0 transition-colors ${
                        isMe ? 'bg-[#F5C518]/5' : 'hover:bg-white/3'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="text-lg">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                            <span className="text-gray-500 font-bold text-sm">{i + 1}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#F5C518]/20 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                            {member.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={member.photo_url} alt={member.pseudo} className="w-full h-full object-cover" />
                            ) : member.pseudo.slice(0, 1)}
                          </div>
                          <div>
                            <span className={`font-bold text-sm ${isMe ? 'text-[#F5C518]' : 'text-white'}`}>
                              {member.pseudo}
                            </span>
                            <div className="text-xs text-gray-600">{flag} {member.nation}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[#F5C518] font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                          {member.coins.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-sm hidden sm:table-cell">
                        {member.predictions_correct}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-sm hidden sm:table-cell">
                        {member.battles_won}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity feed */}
        <div>
          <h2 className="text-lg font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            ACTIVITÉ EN DIRECT
          </h2>
          <div className="glass rounded-2xl p-4 max-h-96 overflow-y-auto space-y-3">
            {activities.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">
                Aucune activité pour l&apos;instant
              </p>
            ) : (
              activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-[#F5C518]/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {activity.user?.pseudo?.slice(0, 1) ?? '?'}
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs leading-relaxed">{activity.message}</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {new Date(activity.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
