'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Swords, Trophy, X, Clock, Plus, Flame, ChevronRight } from 'lucide-react'
import { GameCard } from '@/components/ui/Card'
import type { Battle } from '@/types'
import toast from 'react-hot-toast'

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

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            BATTLES
          </h1>
          {totalPlayed > 0 && (
            <p className="text-gray-500 text-sm flex items-center gap-1">
              <Trophy size={12} className="text-[#F5C518]" />
              {totalWins}V / {totalPlayed - totalWins}D
              {totalWins / totalPlayed >= 0.6 && (
                <span className="text-orange-400 flex items-center gap-0.5">
                  <Flame size={12} /> {Math.round((totalWins / totalPlayed) * 100)}%
                </span>
              )}
            </p>
          )}
        </div>
        <Link
          href="/battles/new"
          className="inline-flex items-center gap-2 bg-[#F5C518] hover:bg-[#ffd700] text-black font-black px-5 py-2.5 rounded-xl transition-all hover:scale-105 text-sm"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          <Plus size={14} /> NOUVEAU BATTLE
        </Link>
      </div>

      {/* Pending: challenges to accept */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-black text-white mb-3 flex items-center gap-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            DÉFIS À ACCEPTER ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((battle) => (
              <BattleCard key={battle.id} battle={battle} currentUserId={currentUserId} />
            ))}
          </div>
        </section>
      )}

      {/* Waiting: sent challenges */}
      {waiting.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-black text-gray-500 mb-3" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            DÉFIS ENVOYÉS ({waiting.length})
          </h2>
          <div className="space-y-3">
            {waiting.map((battle) => (
              <BattleCard key={battle.id} battle={battle} currentUserId={currentUserId} />
            ))}
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <h2 className="text-base font-black text-white mb-3" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          HISTORIQUE ({finished.length})
        </h2>
        {finished.length === 0 && waiting.length === 0 && pending.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Swords size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-white font-bold text-lg mb-2">Aucun battle pour l&apos;instant</p>
            <p className="text-gray-500 text-sm mb-6">Lance ton premier défi contre un membre de ton groupe</p>
            <Link
              href="/battles/new"
              className="inline-flex items-center gap-2 bg-[#F5C518] text-black font-black px-6 py-3 rounded-xl hover:bg-[#ffd700] transition-colors"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              <Swords size={16} /> LANCER UN BATTLE
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {finished.map((battle) => (
              <BattleCard key={battle.id} battle={battle} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function BattleCard({ battle, currentUserId }: { battle: Battle; currentUserId: string }) {
  const router = useRouter()
  const [declining, setDeclining] = useState(false)

  const isChallenger = battle.challenger_id === currentUserId
  const opponent = isChallenger
    ? (battle.opponent as unknown as { pseudo: string; nation: string } | null)
    : (battle.challenger as unknown as { pseudo: string; nation: string } | null)

  const myCard = isChallenger ? battle.challenger_card : battle.opponent_card
  const theirCard = isChallenger ? battle.opponent_card : battle.challenger_card

  const didWin = battle.winner_id === currentUserId
  const isFinished = battle.status === 'finished'
  const isDeclined = battle.status === 'declined'
  const isPending = battle.status === 'pending'
  const isMyPendingChallenge = isPending && !isChallenger

  const opponentFlag = opponent ? (NATION_FLAGS[opponent.nation] ?? '🌍') : ''

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
    if (isFinished) router.push(`/battles/${battle.id}`)
    if (isMyPendingChallenge) router.push(`/battles/${battle.id}/accept`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={`glass rounded-2xl p-4 border transition-all ${
        isMyPendingChallenge
          ? 'border-red-500/30 cursor-pointer hover:border-red-500/50'
          : isFinished && didWin
          ? 'border-[#F5C518]/20 cursor-pointer hover:border-[#F5C518]/40'
          : isFinished && !didWin
          ? 'border-red-500/10 cursor-pointer hover:border-red-500/30'
          : isDeclined
          ? 'border-white/5 opacity-60'
          : 'border-white/5'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{isChallenger ? 'Tu as défié' : 'Défié par'}</span>
          <span className="text-white font-bold text-sm">
            {opponentFlag} {opponent?.pseudo ?? '?'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#F5C518] font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {battle.coins_stake} SC
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isDeclined ? 'bg-gray-500/10 text-gray-500' :
            isPending ? 'bg-yellow-500/10 text-yellow-400' :
            didWin ? 'bg-green-500/10 text-green-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            {isDeclined
              ? 'Refusé'
              : isPending
              ? <span className="inline-flex items-center gap-1"><Clock size={10} /> En attente</span>
              : didWin
                ? <span className="inline-flex items-center gap-1"><Trophy size={10} /> Victoire</span>
                : <span className="inline-flex items-center gap-1"><X size={10} /> Défaite</span>
            }
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {myCard ? (
            <GameCard card={myCard} owned size="sm" />
          ) : (
            <div className="w-16 h-22 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 text-xs">
              ?
            </div>
          )}
        </div>

        <div className="flex-1 text-center">
          {isFinished && battle.result_summary ? (
            <div>
              <div className="text-xl font-black text-gray-500 mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>VS</div>
              <div className="text-xs text-gray-600">{battle.result_summary}</div>
            </div>
          ) : (
            <div className="text-2xl font-black text-gray-500" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>VS</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {theirCard ? (
            <GameCard card={theirCard} owned size="sm" />
          ) : (
            <div className="w-16 h-22 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 text-xs">
              ?
            </div>
          )}
        </div>

        {isFinished && (
          <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
        )}
      </div>

      {isMyPendingChallenge && (
        <div className="mt-3 flex gap-2">
          <Link
            href={`/battles/${battle.id}/accept`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-center bg-[#F5C518] text-black font-black py-2 rounded-xl text-sm hover:bg-[#ffd700] transition-colors"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            <Swords size={14} className="inline mr-1" /> ACCEPTER
          </Link>
          <button
            onClick={handleDecline}
            disabled={declining}
            className="px-4 py-2 border border-white/10 text-gray-500 hover:text-white disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
          >
            {declining ? '...' : 'Refuser'}
          </button>
        </div>
      )}
    </motion.div>
  )
}
