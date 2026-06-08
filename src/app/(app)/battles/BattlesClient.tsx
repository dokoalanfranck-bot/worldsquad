'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Swords, Trophy, X, Clock, Plus } from 'lucide-react'
import { GameCard } from '@/components/ui/Card'
import type { Battle } from '@/types'

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
  const active = battles.filter((b) => b.status === 'accepted')
  const finished = battles.filter((b) => b.status === 'finished')

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            BATTLES
          </h1>
          <p className="text-gray-500 text-sm">Défie tes amis en duel de cartes</p>
        </div>
        <Link
          href="/battles/new"
          className="inline-flex items-center gap-2 bg-[#F5C518] hover:bg-[#ffd700] text-black font-black px-6 py-3 rounded-xl transition-all hover:scale-105"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          <Plus size={16} /> NOUVEAU BATTLE
        </Link>
      </div>

      {/* Pending challenges */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            DÉFIS EN ATTENTE ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((battle) => (
              <BattleCard key={battle.id} battle={battle} currentUserId={currentUserId} />
            ))}
          </div>
        </section>
      )}

      {/* Active battles */}
      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            EN COURS ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map((battle) => (
              <BattleCard key={battle.id} battle={battle} currentUserId={currentUserId} />
            ))}
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <h2 className="text-lg font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          HISTORIQUE ({finished.length})
        </h2>
        {finished.length === 0 && (active.length === 0) && (pending.length === 0) ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="flex justify-center mb-4">
              <Swords size={48} className="text-gray-600" />
            </div>
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
  const isChallenger = battle.challenger_id === currentUserId
  const opponent = isChallenger
    ? (battle.opponent as unknown as { pseudo: string; nation: string } | null)
    : (battle.challenger as unknown as { pseudo: string; nation: string } | null)

  const myCard = isChallenger ? battle.challenger_card : battle.opponent_card
  const theirCard = isChallenger ? battle.opponent_card : battle.challenger_card

  const didWin = battle.winner_id === currentUserId
  const isFinished = battle.status === 'finished'
  const isPending = battle.status === 'pending'

  const opponentFlag = opponent ? (NATION_FLAGS[opponent.nation] ?? '🌍') : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-4 border ${
        isPending && !isChallenger
          ? 'border-red-500/30'
          : isFinished && didWin
          ? 'border-[#F5C518]/20'
          : isFinished && !didWin
          ? 'border-red-500/10'
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
            isPending ? 'bg-yellow-500/10 text-yellow-400' :
            battle.status === 'accepted' ? 'bg-blue-500/10 text-blue-400' :
            didWin ? 'bg-green-500/10 text-green-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            {isPending
              ? <span className="inline-flex items-center gap-1"><Clock size={10} /> En attente</span>
              : battle.status === 'accepted' ? 'Accepté'
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
          <span className="text-xs text-gray-500 font-semibold">Ta carte</span>
        </div>

        <div className="flex-1 text-center">
          <div className="text-2xl font-black text-gray-500" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            VS
          </div>
          {isFinished && battle.stat_compared && (
            <div className="text-xs text-gray-600 mt-1">{battle.stat_compared}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-semibold">Leur carte</span>
          {theirCard ? (
            <GameCard card={theirCard} owned size="sm" />
          ) : (
            <div className="w-16 h-22 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 text-xs">
              ?
            </div>
          )}
        </div>
      </div>

      {isFinished && battle.result_summary && (
        <div className="mt-3 p-2 rounded-lg bg-white/5 text-center text-xs text-gray-400">
          {battle.result_summary}
        </div>
      )}

      {isPending && !isChallenger && (
        <div className="mt-3 flex gap-2">
          <Link
            href={`/battles/${battle.id}/accept`}
            className="flex-1 text-center bg-[#F5C518] text-black font-black py-2 rounded-xl text-sm hover:bg-[#ffd700] transition-colors"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            <Swords size={14} className="inline mr-1" /> ACCEPTER
          </Link>
          <button className="px-4 py-2 border border-white/10 text-gray-500 hover:text-white rounded-xl text-sm font-semibold transition-colors">
            Refuser
          </button>
        </div>
      )}
    </motion.div>
  )
}
