'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CoinDisplay } from '@/components/ui/CoinDisplay'
import type { User, Match, Prediction, GroupActivity } from '@/types'

interface Props {
  profile: User
  nextMatch: Match | null
  recentPredictions: (Prediction & { match: Match })[]
  group: { id: string; name: string; code: string } | null
  groupActivity: (GroupActivity & { user: { pseudo: string; photo_url: string | null } | null })[]
  groupLeaderboard: Array<{ id: string; pseudo: string; photo_url: string | null; nation: string; coins: number; predictions_correct: number; battles_won: number } | null>
}

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    function update() {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return (
    <div className="flex items-center gap-3">
      {[
        { val: timeLeft.d, label: 'J' },
        { val: timeLeft.h, label: 'H' },
        { val: timeLeft.m, label: 'M' },
        { val: timeLeft.s, label: 'S' },
      ].map(({ val, label }) => (
        <div key={label} className="text-center">
          <div className="countdown-digit leading-none">{String(val).padStart(2, '0')}</div>
          <div className="text-xs text-gray-600 font-semibold mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  )
}

export function DashboardClient({
  profile,
  nextMatch,
  recentPredictions,
  group,
  groupActivity,
  groupLeaderboard,
}: Props) {
  const [liveActivities, setLiveActivities] = useState(groupActivity)
  const supabase = createClient()

  const nationData: Record<string, string> = {
    France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  }
  const flag = nationData[profile.nation] ?? '🌍'

  // Realtime group activity feed
  useEffect(() => {
    if (!group) return
    const channel = supabase
      .channel(`group:${group.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_activities',
          filter: `group_id=eq.${group.id}`,
        },
        (payload) => {
          setLiveActivities((prev) => [payload.new as GroupActivity & { user: { pseudo: string; photo_url: string | null } | null }, ...prev].slice(0, 10))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [group, supabase])

  const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
  const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1
            className="text-3xl md:text-4xl font-black text-white"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            BONJOUR {profile.pseudo.toUpperCase()} {flag}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CoinDisplay amount={profile.coins} size="lg" />
          {profile.is_vip && (
            <span className="bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] text-xs font-bold px-2 py-1 rounded-lg">
              👑 VIP
            </span>
          )}
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {/* Next match widget */}
        {nextMatch && (
          <motion.div variants={item} className="col-span-1 md:col-span-2 xl:col-span-2">
            <Link href={`/matches/${nextMatch.id}`}>
              <div className="glass rounded-2xl p-6 hover:bg-white/5 transition-colors group border border-white/5 hover:border-[#F5C518]/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      Prochain match
                    </p>
                    <p className="text-white font-bold mt-0.5">
                      {new Date(nextMatch.match_date).toLocaleDateString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className="text-xs bg-[#F5C518]/10 text-[#F5C518] font-bold px-2 py-1 rounded-lg uppercase">
                    {nextMatch.phase}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-4xl mb-1">{nextMatch.flag_a ?? '🏳'}</div>
                    <div className="font-black text-white text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                      {nextMatch.team_a}
                    </div>
                  </div>
                  <div className="px-6 text-center">
                    <div className="text-gray-500 font-black text-2xl" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>VS</div>
                    <Countdown targetDate={nextMatch.match_date} />
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-4xl mb-1">{nextMatch.flag_b ?? '🏳'}</div>
                    <div className="font-black text-white text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                      {nextMatch.team_b}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center">
                  <span className="text-sm text-[#F5C518] font-bold group-hover:underline">
                    ⚽ Faire mon pronostic →
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* User card widget */}
        <motion.div variants={item}>
          <div className="glass rounded-2xl p-6 border border-white/5 h-full">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-4">Ta Carte</p>
            <div className="flex flex-col items-center gap-3">
              {profile.card_image_url ? (
                <img
                  src={profile.card_image_url}
                  alt="Carte supporter"
                  className="w-32 rounded-xl"
                  style={{ boxShadow: '0 0 20px rgba(245,197,24,0.2)' }}
                />
              ) : (
                <div className="w-32 h-44 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl mb-1">{flag}</div>
                    <div className="text-white font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                      {profile.pseudo}
                    </div>
                    <div className="text-[#F5C518] text-xs font-bold mt-1">{profile.level}</div>
                  </div>
                </div>
              )}
              <div className="text-center">
                <p className="text-white font-bold">{profile.pseudo}</p>
                <p className="text-gray-500 text-sm">{profile.nation} {flag}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                  <span>✅ {profile.predictions_correct} pronos</span>
                  <span>⚔️ {profile.battles_won} battles</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent predictions */}
        <motion.div variants={item} className="col-span-1 md:col-span-2">
          <div className="glass rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Tes derniers pronostics
              </p>
              <Link href="/matches" className="text-xs text-[#F5C518] hover:underline font-semibold">
                Voir tout →
              </Link>
            </div>
            {recentPredictions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-sm">Aucun pronostic pour l&apos;instant</p>
                <Link href="/matches" className="text-[#F5C518] text-sm font-bold hover:underline mt-2 inline-block">
                  Voir les matchs →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentPredictions.map((pred) => (
                  <div key={pred.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{pred.match?.flag_a ?? '🏳'}</span>
                      <span className="text-white font-bold text-sm">
                        {pred.pred_score_a} - {pred.pred_score_b}
                      </span>
                      <span className="text-lg">{pred.match?.flag_b ?? '🏳'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pred.status === 'correct_score' && (
                        <span className="text-xs bg-green-500/10 text-green-400 font-bold px-2 py-0.5 rounded">
                          +300 🪙
                        </span>
                      )}
                      {pred.status === 'correct_winner' && (
                        <span className="text-xs bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded">
                          +100 🪙
                        </span>
                      )}
                      {pred.status === 'wrong' && (
                        <span className="text-xs bg-red-500/10 text-red-400 font-bold px-2 py-0.5 rounded">
                          Raté
                        </span>
                      )}
                      {pred.status === 'pending' && (
                        <span className="text-xs bg-white/5 text-gray-500 font-bold px-2 py-0.5 rounded">
                          En attente
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Group activity feed */}
        {group && (
          <motion.div variants={item}>
            <div className="glass rounded-2xl p-6 border border-white/5 h-full max-h-80 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Activité du groupe
                  </p>
                  <p className="text-white font-bold text-sm mt-0.5">{group.name}</p>
                </div>
                <Link href="/group" className="text-xs text-[#F5C518] hover:underline font-semibold">
                  Groupe →
                </Link>
              </div>
              {liveActivities.length === 0 ? (
                <p className="text-gray-600 text-sm">Aucune activité pour l&apos;instant</p>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-48">
                  {liveActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2 text-xs">
                      <div className="w-6 h-6 rounded-full bg-[#F5C518]/20 flex items-center justify-center flex-shrink-0 text-xs">
                        {activity.user?.pseudo?.slice(0, 1) ?? '?'}
                      </div>
                      <p className="text-gray-400 leading-relaxed">{activity.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* No group CTA */}
        {!group && (
          <motion.div variants={item}>
            <div className="glass rounded-2xl p-6 border border-[#F5C518]/10 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-white font-bold mb-1">Pas encore dans un groupe</p>
              <p className="text-gray-500 text-sm mb-4">Rejoins tes amis pour jouer ensemble</p>
              <Link
                href="/group"
                className="inline-flex items-center gap-2 bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] font-bold text-sm px-4 py-2 rounded-xl hover:bg-[#F5C518]/20 transition-colors"
              >
                Créer / Rejoindre un groupe
              </Link>
            </div>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div variants={item} className="col-span-1 md:col-span-2 xl:col-span-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="glass rounded-xl p-4 text-center border border-white/5 hover:border-white/15 transition-colors cursor-pointer"
                >
                  <div className="text-3xl mb-2">{action.icon}</div>
                  <div className="text-white font-bold text-sm">{action.label}</div>
                  <div className="text-gray-600 text-xs mt-0.5">{action.sub}</div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

const QUICK_ACTIONS = [
  { href: '/matches', icon: '⚽', label: 'Pronostics', sub: '104 matchs' },
  { href: '/packs', icon: '🎁', label: 'Ouvrir un pack', sub: 'Dès 100 coins' },
  { href: '/battles', icon: '⚔️', label: 'Battle', sub: 'Défie tes potes' },
  { href: '/shop', icon: '🪙', label: 'Boutique', sub: 'Acheter des coins' },
]
