'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Swords, Trophy, X, Clock, Plus, Flame, ChevronRight, Wifi, TrendingUp } from 'lucide-react'
import type { Battle } from '@/types'
import toast from 'react-hot-toast'
import { RARITY_COLORS } from '@/types'

const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾', Italy: '🇮🇹',
  USA: '🇺🇸', Mexico: '🇲🇽', Canada: '🇨🇦', Morocco: '🇲🇦',
}

interface Props {
  battles: Battle[]
  currentUserId: string
}

export function BattlesClient({ battles, currentUserId }: Props) {
  const pending = battles.filter((b) => b.status === 'pending' && b.opponent_id === currentUserId)
  const waiting = battles.filter((b) => b.status === 'pending' && b.challenger_id === currentUserId)
  const finished = battles.filter((b) => b.status === 'finished' || b.status === 'declined')

  const totalWins = finished.filter((b) => b.winner_id === currentUserId).length
  const totalPlayed = finished.filter((b) => b.status === 'finished').length
  const winRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">

      {/* ── Team Match CTA ── */}
      <Link href="/battles/matchmaking" className="block mb-5">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="relative rounded-2xl overflow-hidden p-5 border border-[#F5C518]/25"
          style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.08) 0%, rgba(9,21,36,0.9) 100%)' }}
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(245,197,24,0.06) 50%, transparent 60%)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'linear' }}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Wifi size={14} className="text-[#F5C518] flex-shrink-0" />
                <span className="text-[#F5C518] font-black text-sm tracking-wide" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  TEAM MATCH — MATCHMAKING
                </span>
              </div>
              <p className="text-white font-bold text-sm">3 joueurs + coach · Cohésion</p>
              <p className="text-gray-500 text-xs mt-0.5">Simulation en direct · Terrain animé · Cartes à gagner</p>
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <span className="text-3xl">⚽</span>
              <ChevronRight size={14} className="text-[#F5C518]" />
            </div>
          </div>
        </motion.div>
      </Link>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="min-w-0">
          <h1 className="text-4xl font-black text-white leading-none" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            BATTLES
          </h1>
          {totalPlayed > 0 && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <Trophy size={10} className="text-[#F5C518]" />
                {totalWins}V · {totalPlayed - totalWins}D
              </span>
              {winRate >= 60 && (
                <span className="text-orange-400 text-xs flex items-center gap-1">
                  <Flame size={10} /> {winRate}%
                </span>
              )}
            </div>
          )}
        </div>
        <Link
          href="/battles/matchmaking"
          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-[#F5C518] text-black font-black px-4 py-2.5 rounded-xl text-sm"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          <Plus size={13} /> BATTLE
        </Link>
      </div>

      {/* ── Stats bar ── */}
      {totalPlayed >= 3 && (
        <div className="glass rounded-xl p-3 mb-5 flex items-center gap-4">
          <TrendingUp size={14} className="text-[#F5C518] flex-shrink-0" />
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#F5C518]"
              initial={{ width: 0 }}
              animate={{ width: `${winRate}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
          <span className="text-xs font-black text-white flex-shrink-0">{winRate}% victoires</span>
        </div>
      )}

      {/* ── Pending: challenges to accept ── */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <SectionHeader
              label={`DÉFIS À ACCEPTER (${pending.length})`}
              dot="red"
            />
            <div className="space-y-2.5">
              {pending.map((battle) => (
                <BattleCard key={battle.id} battle={battle} currentUserId={currentUserId} />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Waiting: sent challenges ── */}
      {waiting.length > 0 && (
        <section className="mb-6">
          <SectionHeader label={`DÉFIS ENVOYÉS (${waiting.length})`} muted />
          <div className="space-y-2.5">
            {waiting.map((battle) => (
              <BattleCard key={battle.id} battle={battle} currentUserId={currentUserId} />
            ))}
          </div>
        </section>
      )}

      {/* ── History ── */}
      <section>
        <SectionHeader label={`HISTORIQUE (${finished.length})`} />
        {finished.length === 0 && waiting.length === 0 && pending.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2.5">
            {finished.map((battle) => (
              <BattleCard key={battle.id} battle={battle} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeader({ label, dot, muted }: { label: string; dot?: 'red'; muted?: boolean }) {
  return (
    <h2
      className={`text-sm font-black mb-2.5 flex items-center gap-2 ${muted ? 'text-gray-500' : 'text-white'}`}
      style={{ fontFamily: 'Bebas Neue, sans-serif' }}
    >
      {dot === 'red' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
      {label}
    </h2>
  )
}

function EmptyState() {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <Swords size={44} className="text-gray-700 mx-auto mb-4" />
      <p className="text-white font-bold text-lg mb-1">Aucun battle</p>
      <p className="text-gray-500 text-sm mb-6">Lance ton premier défi contre un adversaire</p>
      <Link
        href="/battles/matchmaking"
        className="inline-flex items-center gap-2 bg-[#F5C518] text-black font-black px-6 py-3 rounded-xl"
        style={{ fontFamily: 'Bebas Neue, sans-serif' }}
      >
        <Swords size={15} /> LANCER UN BATTLE
      </Link>
    </div>
  )
}

// ── BattleCard ────────────────────────────────────────────────────────────────

function BattleCard({ battle, currentUserId }: { battle: Battle; currentUserId: string }) {
  const router = useRouter()
  const [declining, setDeclining] = useState(false)

  const isChallenger = battle.challenger_id === currentUserId
  const opponent = isChallenger
    ? (battle.opponent as unknown as { pseudo: string; nation: string } | null)
    : (battle.challenger as unknown as { pseudo: string; nation: string } | null)

  const myCard = (isChallenger ? battle.challenger_card : battle.opponent_card) ?? null
  const theirCard = (isChallenger ? battle.opponent_card : battle.challenger_card) ?? null

  const didWin = battle.winner_id === currentUserId
  const isFinished = battle.status === 'finished'
  const isDeclined = battle.status === 'declined'
  const isPending = battle.status === 'pending'
  const isMyPendingChallenge = isPending && !isChallenger

  const opponentFlag = opponent ? (NATION_FLAGS[opponent.nation] ?? '🌍') : '🌍'

  async function handleDecline(e: React.MouseEvent) {
    e.stopPropagation()
    setDeclining(true)
    try {
      const res = await fetch(`/api/battles/${battle.id}/decline`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Défi refusé')
      router.refresh()
    } catch {
      toast.error('Erreur')
      setDeclining(false)
    }
  }

  function handleClick() {
    if (battle.type === 'team_match') { router.push(`/battles/${battle.id}/play`); return }
    if (isFinished) router.push(`/battles/${battle.id}`)
    if (isMyPendingChallenge) router.push(`/battles/${battle.id}/accept`)
  }

  // Status colors
  const statusColor = isDeclined ? 'text-gray-500' : isPending ? 'text-amber-400' : didWin ? 'text-green-400' : 'text-red-400'
  const borderClass = isMyPendingChallenge
    ? 'border-red-500/30'
    : isFinished && didWin
    ? 'border-[#F5C518]/15'
    : isFinished && !didWin
    ? 'border-red-500/10'
    : 'border-white/5'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={`glass rounded-2xl border transition-all overflow-hidden ${borderClass} ${
        (isFinished || isMyPendingChallenge) ? 'cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      <div className="p-4">
        {/* Top row: participants + stake */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base flex-shrink-0">{opponentFlag}</span>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate leading-none">
                {isChallenger ? 'vs ' : 'Défi de '}{opponent?.pseudo ?? '?'}
              </p>
              <p className="text-gray-600 text-[10px] mt-0.5">
                {isChallenger ? 'Tu as défié' : 'Défié par'} · {battle.coins_stake} SC
              </p>
            </div>
          </div>
          {/* Status badge */}
          <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
            isDeclined ? 'bg-gray-500/10 text-gray-500' :
            isPending ? 'bg-amber-500/10 text-amber-400' :
            didWin ? 'bg-green-500/10 text-green-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            {isDeclined ? (
              'Refusé'
            ) : isPending ? (
              <><Clock size={10} /> En attente</>
            ) : didWin ? (
              <><Trophy size={10} /> Victoire</>
            ) : (
              <><X size={10} /> Défaite</>
            )}
          </div>
        </div>

        {/* Cards + score row */}
        <div className="flex items-center gap-3">
          {/* My card chip */}
          <CardChip card={myCard} />

          {/* Score / VS */}
          <div className="flex-1 text-center">
            {isFinished ? (
              <div>
                <p className={`text-lg font-black leading-none ${statusColor}`} style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  {didWin ? 'VICTOIRE' : 'DÉFAITE'}
                </p>
                {battle.result_summary && (
                  <p className="text-[10px] text-gray-600 mt-0.5 truncate max-w-[80px]">{battle.result_summary}</p>
                )}
              </div>
            ) : (
              <p className="text-2xl font-black text-gray-600" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>VS</p>
            )}
          </div>

          {/* Their card chip */}
          <CardChip card={theirCard} />

          {isFinished && <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />}
        </div>

        {/* Accept/decline buttons */}
        {isMyPendingChallenge && (
          <div className="mt-3 flex gap-2">
            <Link
              href={`/battles/${battle.id}/accept`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-center bg-[#F5C518] text-black font-black py-2.5 rounded-xl text-sm"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              <Swords size={13} className="inline mr-1" /> ACCEPTER
            </Link>
            <button
              onClick={handleDecline}
              disabled={declining}
              className="px-4 py-2.5 border border-white/10 text-gray-500 hover:text-white disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
            >
              {declining ? '…' : 'Refuser'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── CardChip — compact card thumbnail ────────────────────────────────────────

function CardChip({ card }: { card: import('@/types').Card | null }) {
  if (!card) {
    return (
      <div className="w-[60px] h-[84px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-700 text-xl flex-shrink-0">
        ?
      </div>
    )
  }

  const rarityColor = RARITY_COLORS[card.rarity as keyof typeof RARITY_COLORS] ?? '#9CA3AF'
  const flag = NATION_FLAGS[card.nation ?? ''] ?? '🌍'

  return (
    <div
      className="w-[60px] h-[84px] rounded-xl overflow-hidden relative flex-shrink-0 flex flex-col items-center justify-center gap-0.5"
      style={{ background: `linear-gradient(145deg, ${rarityColor}15, ${rarityColor}28)`, border: `1.5px solid ${rarityColor}50` }}
    >
      {card.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.image_url} alt={card.name} className="w-full h-[62px] object-cover object-top" />
      ) : (
        <>
          <span className="text-xl">{flag}</span>
          <p
            className="text-white text-[8px] font-black text-center leading-tight px-1 truncate w-full"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            {card.name}
          </p>
        </>
      )}
      <div
        className="absolute bottom-0 left-0 right-0 text-center text-[7px] font-black py-0.5"
        style={{ background: `${rarityColor}60`, color: rarityColor }}
      >
        {card.rarity.toUpperCase().slice(0, 4)}
      </div>
    </div>
  )
}
