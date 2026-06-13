'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Calendar, Gift, Swords, ShoppingBag, Crown, Target,
  CheckCircle2, XCircle, Clock, Users, Flame, ChevronRight,
  TrendingUp, type LucideIcon, Trophy, Star, Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CoinDisplay } from '@/components/ui/CoinDisplay'
import { DailyMissions } from '@/components/DailyMissions'
import { FlashChallengeBanner } from '@/components/FlashChallengeBanner'
import type { User, Match, Prediction, GroupActivity } from '@/types'
import type { DailyMissionsRow } from '@/lib/missions'
import type { FlashChallenge } from '@/lib/flash-challenges'
import toast from 'react-hot-toast'

interface DailyRewardState {
  canClaim: boolean
  nextClaim: string | null
  streak: number
  todayReward: number
}

interface Props {
  profile: User
  nextMatch: Match | null
  recentPredictions: (Prediction & { match: Match })[]
  group: { id: string; name: string; code: string } | null
  groupActivity: (GroupActivity & { user: { pseudo: string; photo_url: string | null } | null })[]
  dailyReward: DailyRewardState
  missions: DailyMissionsRow | null
  liveMatches: Match[]
  recentFinished: Match[]
  flashChallenges: FlashChallenge[]
}

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Morocco: '🇲🇦', USA: '🇺🇸', Mexico: '🇲🇽', Belgium: '🇧🇪',
  Japan: '🇯🇵', Senegal: '🇸🇳', Croatia: '🇭🇷', Uruguay: '🇺🇾',
}
const flag = (n: string) => NATION_FLAGS[n] ?? '🌍'

// ── Countdown ────────────────────────────────���────────────────────────────────
function Countdown({ targetDate }: { targetDate: string }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    function tick() {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) { setT({ d: 0, h: 0, m: 0, s: 0 }); return }
      setT({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
    }
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [targetDate])

  return (
    <div className="flex items-center gap-2">
      {[{ v: t.d, l: 'J' }, { v: t.h, l: 'H' }, { v: t.m, l: 'M' }, { v: t.s, l: 'S' }].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center">
          <span className="text-white font-black text-lg tabular-nums leading-none" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {String(v).padStart(2, '0')}
          </span>
          <span className="text-white/30 text-[9px] font-bold">{l}</span>
        </div>
      ))}
    </div>
  )
}

// ── Live scores ───────────────────────────────────────────────────────────────
function LiveScores({ initialLive, initialFinished }: { initialLive: Match[]; initialFinished: Match[] }) {
  const supabase = createClient()
  const [live, setLive] = useState(initialLive)
  const [finished, setFinished] = useState(initialFinished)

  useEffect(() => {
    const ch = supabase.channel('live-scores-dash')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (p) => {
        const m = p.new as Match
        if (m.status === 'live') {
          setLive((prev) => { const e = prev.find((x) => x.id === m.id); return e ? prev.map((x) => x.id === m.id ? m : x) : [m, ...prev] })
          setFinished((prev) => prev.filter((x) => x.id !== m.id))
        } else if (m.status === 'finished') {
          setLive((prev) => prev.filter((x) => x.id !== m.id))
          setFinished((prev) => { const e = prev.find((x) => x.id === m.id); return (e ? prev.map((x) => x.id === m.id ? m : x) : [m, ...prev]).slice(0, 3) })
        }
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  if (live.length === 0 && finished.length === 0) return null

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/5 mb-4">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {live.length > 0 && <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-red-400 font-black text-xs uppercase tracking-widest">En Direct</span></>}
          {live.length > 0 && finished.length > 0 && <span className="text-white/10">·</span>}
          {finished.length > 0 && <span className="text-white/40 text-xs font-semibold">Terminés</span>}
        </div>
        <Link href="/matches" className="flex items-center gap-1 text-[#F5C518] text-xs font-bold hover:opacity-80">
          Tous les matchs <ChevronRight size={12} />
        </Link>
      </div>
      <div className="divide-y divide-white/5">
        <AnimatePresence initial={false}>
          {live.map((m) => (
            <motion.div key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Link href={`/matches/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">{m.flag_a ?? '🏳'}</span>
                  <span className="text-white font-bold text-sm truncate">{m.team_a}</span>
                </div>
                <div className="text-center px-2">
                  <span className="text-white font-black text-lg tabular-nums" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{m.score_a ?? 0}</span>
                  <span className="text-red-400 text-[10px] font-black mx-1.5 animate-pulse">LIVE</span>
                  <span className="text-white font-black text-lg tabular-nums" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{m.score_b ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-white font-bold text-sm truncate text-right">{m.team_b}</span>
                  <span className="text-lg">{m.flag_b ?? '🏳'}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
        {finished.map((m) => (
          <Link key={m.id} href={`/matches/${m.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors opacity-50">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-base">{m.flag_a ?? '🏳'}</span>
              <span className="text-white/70 text-sm truncate">{m.team_a}</span>
            </div>
            <span className="text-white font-black text-base tabular-nums px-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{m.score_a ?? '-'} — {m.score_b ?? '-'}</span>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="text-white/70 text-sm truncate text-right">{m.team_b}</span>
              <span className="text-base">{m.flag_b ?? '🏳'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Daily reward ──────────────────────────────────────────────────────────────
function DailyReward({ initial }: { initial: DailyRewardState }) {
  const [state, setState] = useState(initial)
  const [claiming, setClaiming] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const REWARDS = [100, 150, 200, 250, 350, 500, 750]

  useEffect(() => {
    if (state.canClaim || !state.nextClaim) return
    function tick() {
      const diff = new Date(state.nextClaim!).getTime() - Date.now()
      if (diff <= 0) { setState((s) => ({ ...s, canClaim: true })); return }
      const h = Math.floor(diff / 3_600_000), m = Math.floor((diff % 3_600_000) / 60_000), s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [state.canClaim, state.nextClaim])

  async function claim() {
    setClaiming(true)
    try {
      const res = await fetch('/api/daily-reward', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error === 'already_claimed' ? 'Déjà réclamée aujourd\'hui !' : data.error); return }
      toast.success(`+${data.coins} coins — Série : ${data.streak} jour${data.streak > 1 ? 's' : ''}`)
      setState({ canClaim: false, nextClaim: null, streak: data.streak, todayReward: data.coins })
    } finally { setClaiming(false) }
  }

  return (
    <div className={`rounded-2xl p-5 border ${state.canClaim ? 'border-[#F5C518]/40 bg-[#F5C518]/5' : 'border-white/5 glass'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${state.canClaim ? 'bg-[#F5C518]/20' : 'bg-white/5'}`}>
            <Gift size={16} className={state.canClaim ? 'text-[#F5C518]' : 'text-white/40'} />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Récompense du jour</p>
            {state.streak > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Flame size={10} className="text-orange-400" />
                <span className="text-orange-400 text-xs font-bold">{state.streak} jour{state.streak > 1 ? 's' : ''} de série</span>
              </div>
            )}
          </div>
        </div>
        {state.canClaim && (
          <span className="text-[#F5C518] font-black text-sm bg-[#F5C518]/10 px-2.5 py-1 rounded-lg">+{state.todayReward}</span>
        )}
      </div>

      <div className="flex gap-1 mb-4">
        {REWARDS.map((coins, i) => {
          const day = i + 1
          const done = day <= state.streak
          const today = state.canClaim && day === Math.min(state.streak + 1, 7)
          return (
            <div key={i} className={`flex-1 rounded-lg py-1.5 text-center border transition-all ${done ? 'bg-[#F5C518]/15 border-[#F5C518]/30' : today ? 'border-[#F5C518]/50 bg-[#F5C518]/8' : 'bg-white/3 border-white/5'}`}>
              <p className="text-[9px] text-white/30 font-semibold">J{day}</p>
              <p className={`text-[10px] font-black mt-0.5 ${done ? 'text-[#F5C518]' : today ? 'text-[#F5C518]/60' : 'text-white/20'}`}>
                {done ? <CheckCircle2 size={10} className="mx-auto" /> : `${coins}`}
              </p>
            </div>
          )
        })}
      </div>

      {state.canClaim ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={claim}
          disabled={claiming}
          className="w-full py-3.5 rounded-xl font-black text-black text-sm disabled:opacity-60 bg-[#F5C518]"
          style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem' }}
          animate={{ boxShadow: ['0 0 0px #F5C51800', '0 0 20px #F5C51860', '0 0 0px #F5C51800'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {claiming ? 'Réclamation…' : `RÉCLAMER +${state.todayReward} COINS`}
        </motion.button>
      ) : (
        <div className="flex items-center justify-between py-2 px-1">
          <span className="text-white/30 text-xs">Prochaine récompense</span>
          <span className="text-white font-black text-base tabular-nums" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{timeLeft || '—'}</span>
        </div>
      )}
    </div>
  )
}

// ── Quick action card ─────────────────────────────────────────────────────────
function QuickAction({ href, icon: Icon, label, sub, accent }: { href: string; icon: LucideIcon; label: string; sub: string; accent: string }) {
  return (
    <Link href={href}>
      <motion.div
        whileTap={{ scale: 0.96 }}
        className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10 active:bg-white/5 transition-all cursor-pointer"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
          <Icon size={20} />
        </div>
        <p className="text-white font-black text-sm leading-tight" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem' }}>{label}</p>
        <p className="text-white/30 text-xs mt-0.5">{sub}</p>
      </motion.div>
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function DashboardClient({ profile, nextMatch, recentPredictions, group, groupActivity, dailyReward, missions, liveMatches, recentFinished, flashChallenges }: Props) {
  const [activities, setActivities] = useState(groupActivity)
  const supabase = createClient()

  useEffect(() => {
    if (!group) return
    const ch = supabase.channel(`group:${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_activities', filter: `group_id=eq.${group.id}` }, (p) => {
        setActivities((prev) => [p.new as GroupActivity & { user: null }, ...prev].slice(0, 10))
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [group, supabase])

  const winRate = profile.battles_played > 0 ? Math.round((profile.battles_won / profile.battles_played) * 100) : 0

  return (
    <div className="max-w-2xl lg:max-w-5xl mx-auto pb-28">

      {/* ── Hero banner FIFA/Panini ─────────────────────────────────────── */}
      <div className="wc26-hero wc-stripe-top px-4 lg:px-8 pt-8 lg:pt-10 pb-6 mb-5">
        {/* Top line: brand + tournament */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[#F5C518]" />
            <span className="text-[#F5C518] font-black text-xs uppercase tracking-widest" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>WorldSquad</span>
          </div>
          <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">FIFA World Cup 2026</span>
        </div>

        {/* Player identity */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{flag(profile.nation)}</span>
              <span className="text-white/40 text-xs font-bold uppercase">{profile.nation}</span>
              {profile.is_vip && (
                <span className="flex items-center gap-0.5 text-[10px] font-black text-[#F5C518] bg-[#F5C518]/10 px-1.5 py-0.5 rounded border border-[#F5C518]/20">
                  <Crown size={9} /> VIP
                </span>
              )}
            </div>
            <h1 className="text-5xl font-black text-white leading-none" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {profile.pseudo.toUpperCase()}
            </h1>
          </div>
          <CoinDisplay amount={profile.coins} size="lg" />
        </div>
      </div>

      {/* ── Content below hero ─────────────────────────────────────────── */}
      <div className="px-4 lg:px-8">
        <div className="lg:flex lg:gap-6 lg:items-start">

          {/* ── RIGHT sidebar (desktop) / TOP cards (mobile) ─────────── */}
          <div className="lg:w-72 lg:flex-shrink-0 lg:order-2">

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: Target, label: 'Pronos', value: profile.predictions_correct, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { icon: Trophy, label: 'Victoires', value: profile.battles_won, color: 'text-[#F5C518]', bg: 'bg-[#F5C518]/10' },
                { icon: TrendingUp, label: 'Win rate', value: profile.battles_played > 0 ? `${winRate}%` : '—', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="glass rounded-xl p-3 border border-white/5 text-center">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon size={14} className={color} />
                  </div>
                  <p className={`font-black text-lg leading-none ${color}`} style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{value}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Daily missions */}
            <DailyMissions initial={missions} streak={dailyReward.streak} />

            {/* Quick actions */}
            <div className="mb-5">
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">Jouer</p>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction href="/battles" icon={Swords} label="DUELS" sub="Défie d'autres joueurs" accent="bg-orange-500/15 text-orange-400" />
                <QuickAction href="/packs" icon={Gift} label="PACKS" sub="Ouvre des cartes" accent="bg-amber-500/15 text-amber-400" />
                <QuickAction href="/matches" icon={Calendar} label="PRONOSTICS" sub="Prédit les matchs" accent="bg-violet-500/15 text-violet-400" />
                <QuickAction href="/shop" icon={ShoppingBag} label="BOUTIQUE" sub="Acheter des coins" accent="bg-blue-500/15 text-blue-400" />
              </div>
            </div>

          </div>{/* end sidebar */}

          {/* ── LEFT main content (desktop) / REST (mobile) ──────────── */}
          <div className="lg:flex-1 lg:min-w-0 lg:order-1">

            {/* Flash challenge banners — top priority */}
            {flashChallenges.map((fc) => (
              <FlashChallengeBanner key={fc.id} challenge={fc} />
            ))}

            {/* Live scores */}
            <LiveScores initialLive={liveMatches} initialFinished={recentFinished} />

            {/* Next match */}
            {nextMatch && (
              <Link href={`/matches/${nextMatch.id}`}>
                <motion.div
                  whileTap={{ scale: 0.99 }}
                  className="glass rounded-2xl p-5 border border-white/5 hover:border-[#F5C518]/20 transition-colors mb-5 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-widest">Prochain match</p>
                      <p className="text-white/60 text-xs mt-0.5">
                        {new Date(nextMatch.match_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-white/5 text-white/40 px-2 py-1 rounded-lg border border-white/5">
                      {nextMatch.phase}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1 text-center">
                      <span className="text-4xl">{nextMatch.flag_a ?? '🏳'}</span>
                      <p className="text-white font-black text-sm mt-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{nextMatch.team_a}</p>
                    </div>
                    <div className="px-4 text-center">
                      <p className="text-white/20 font-black text-sm mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>VS</p>
                      <Countdown targetDate={nextMatch.match_date} />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-4xl">{nextMatch.flag_b ?? '🏳'}</span>
                      <p className="text-white font-black text-sm mt-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{nextMatch.team_b}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[#F5C518] text-sm font-bold">
                    <Target size={13} />
                    <span>Faire mon pronostic</span>
                    <ChevronRight size={13} />
                  </div>
                </motion.div>
              </Link>
            )}

            {/* Recent predictions */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-[10px] uppercase tracking-widest">Mes pronostics</p>
                <Link href="/matches" className="flex items-center gap-1 text-[#F5C518] text-xs font-bold hover:opacity-80">
                  Voir tout <ChevronRight size={12} />
                </Link>
              </div>
              {recentPredictions.length === 0 ? (
                <div className="glass rounded-2xl p-6 border border-white/5 text-center">
                  <Calendar size={28} className="text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">Aucun pronostic pour l&apos;instant</p>
                  <Link href="/matches" className="inline-block mt-3 text-[#F5C518] text-sm font-bold">
                    Voir les matchs →
                  </Link>
                </div>
              ) : (
                <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                  {recentPredictions.slice(0, 5).map((pred) => (
                    <Link key={pred.id} href={`/matches/${pred.match?.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span>{pred.match?.flag_a ?? '🏳'}</span>
                        <span className="text-white/60 text-xs truncate">{pred.match?.team_a}</span>
                        <span className="text-white font-black text-sm tabular-nums">{pred.pred_score_a}–{pred.pred_score_b}</span>
                        <span className="text-white/60 text-xs truncate">{pred.match?.team_b}</span>
                        <span>{pred.match?.flag_b ?? '🏳'}</span>
                      </div>
                      <div className="flex-shrink-0">
                        {pred.status === 'correct_score' && <span className="flex items-center gap-1 text-[10px] font-black text-green-400 bg-green-500/10 px-2 py-0.5 rounded-lg"><CheckCircle2 size={9} /> +300</span>}
                        {pred.status === 'correct_winner' && <span className="flex items-center gap-1 text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg"><CheckCircle2 size={9} /> +100</span>}
                        {pred.status === 'wrong' && <span className="flex items-center gap-1 text-[10px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-lg"><XCircle size={9} /> Raté</span>}
                        {pred.status === 'pending' && <span className="flex items-center gap-1 text-[10px] font-black text-white/30 bg-white/5 px-2 py-0.5 rounded-lg"><Clock size={9} /> Attente</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Group */}
            {group ? (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest">{group.name}</p>
                  <Link href="/group" className="flex items-center gap-1 text-[#F5C518] text-xs font-bold hover:opacity-80">
                    Groupe <ChevronRight size={12} />
                  </Link>
                </div>
                <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                  {activities.length === 0 ? (
                    <p className="px-4 py-5 text-white/30 text-sm text-center">Aucune activité récente</p>
                  ) : (
                    activities.slice(0, 5).map((a) => (
                      <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-[#F5C518]/15 flex items-center justify-center text-[11px] font-black text-[#F5C518] flex-shrink-0">
                          {a.user?.pseudo?.slice(0, 1) ?? '?'}
                        </div>
                        <p className="text-white/50 text-xs leading-relaxed">{a.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 border border-white/5 text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Users size={22} className="text-white/30" />
                </div>
                <p className="text-white font-bold text-sm mb-1">Pas encore dans un groupe</p>
                <p className="text-white/30 text-xs mb-4">Rejoins tes amis pour jouer ensemble</p>
                <Link href="/group" className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
                  <Users size={14} /> Créer ou rejoindre un groupe
                </Link>
              </div>
            )}

          </div>{/* end main */}

        </div>
      </div>{/* end content wrapper */}
    </div>
  )
}
