'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GameCard } from '@/components/ui/Card'
import { Trophy, X, Swords, ArrowLeft, Flame, Check, Clock, Search } from 'lucide-react'
import type { Card } from '@/types'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ShareSheet } from '@/components/ShareSheet'
import { TeamSelectionClient } from './TeamSelectionClient'
import { MatchAnimationClient } from './MatchAnimationClient'

const ALL_STATS = ['pace', 'shooting', 'passing', 'defending', 'dribbling', 'physical']
const STAT_LABELS: Record<string, string> = {
  pace: 'PAC', shooting: 'TIR', passing: 'PAS', defending: 'DEF', dribbling: 'DRI', physical: 'PHY',
}
const STAT_COLORS: Record<string, string> = {
  PAC: '#f59e0b', TIR: '#ef4444', PAS: '#3b82f6', DEF: '#22c55e', DRI: '#a855f7', PHY: '#f97316',
}
const NATION_FLAGS: Record<string, string> = {
  France: '🇫🇷', Brazil: '🇧🇷', Argentina: '🇦🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  USA: '🇺🇸', Mexico: '🇲🇽', Morocco: '🇲🇦', Belgium: '🇧🇪',
}

const ROUND_PHASES = ['round_1', 'round_2', 'round_3'] as const

interface DraftCard {
  id: string; name: string; rarity: string; image_url: string | null
  stats: Record<string, number | string>; type: string; nation: string | null
}
interface RoundResult {
  round: number; stat: string; label: string
  challenger_card: { id: string; name: string }
  opponent_card: { id: string; name: string }
  challenger_val: number; opponent_val: number; winner: string
}
interface RoundPick { stat?: string; challenger?: string; opponent?: string }
interface UserProfile { id: string; pseudo: string; nation: string; photo_url: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Battle = Record<string, any>

interface Props {
  initialBattle: Battle
  currentUserId: string
  myCards: Card[]
}

export function PlayClient({ initialBattle, currentUserId, myCards }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [battle, setBattle] = useState<Battle>(initialBattle)
  const [loading, setLoading] = useState(false)

  // Draft state
  const [selectedDraft, setSelectedDraft] = useState<string[]>([])

  // Round pick state
  const [pickedCard, setPickedCard] = useState<string | null>(null)
  const [roundRevealed, setRoundRevealed] = useState<number>(-1)

  // Claim state
  const [claimCard, setClaimCard] = useState<string | null>(null)

  const phase = battle.phase as string
  const isChallenger = battle.challenger_id === currentUserId
  const isOpponent = battle.opponent_id === currentUserId
  const me = (isChallenger ? battle.challenger : battle.opponent) as UserProfile
  const them = (isChallenger ? battle.opponent : battle.challenger) as UserProfile

  const myDraft = (isChallenger ? battle.challenger_draft : battle.opponent_draft) as DraftCard[] | null
  const theirDraft = (isChallenger ? battle.opponent_draft : battle.challenger_draft) as DraftCard[] | null
  const myBan = (isChallenger ? battle.challenger_ban : battle.opponent_ban) as string | null
  const theirBan = (isChallenger ? battle.opponent_ban : battle.challenger_ban) as string | null
  const rounds = (battle.rounds ?? []) as RoundResult[]
  const roundPicks = (battle.round_picks ?? {}) as Record<string, RoundPick>
  const availableStats = (battle.available_stats ?? []) as string[]
  const winnerId = battle.winner_id as string | null

  // Subscribe to Realtime battle updates
  useEffect(() => {
    const channel = supabase
      .channel(`battle-play-${battle.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${battle.id}`,
      }, ({ new: updated }) => {
        setBattle(updated as Battle)
        // Reset pick state when round advances
        setPickedCard(null)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [battle.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reveal round results with delay
  useEffect(() => {
    if (rounds.length > roundRevealed) {
      setTimeout(() => setRoundRevealed(rounds.length - 1), 300)
    }
  }, [rounds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function post(path: string, body: object) {
    setLoading(true)
    try {
      const res = await fetch(`/api/battles/${battle.id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) toast.error(data.error ?? 'Erreur')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  // ── Nouvelles phases team_match ─────────────────────────────────────────
  if (battle.type === 'team_match') {
    if (phase === 'team_selection') {
      return <TeamSelectionClient battle={battle} currentUserId={currentUserId} myCards={myCards} />
    }
    if (phase === 'match_ready') {
      return <MatchAnimationClient battle={battle} currentUserId={currentUserId} />
    }
    if (phase === 'pick_reward') {
      return (
        <TeamMatchPickReward
          battleId={battle.id}
          iWon={winnerId === currentUserId}
          them={them}
          finalScore={battle.final_score as { home: number; away: number } | null}
        />
      )
    }
    if (phase === 'finished') {
      const iWon = winnerId === currentUserId
      const isDraw = !winnerId
      const finalScore = battle.final_score as { home: number; away: number } | null
      const rewardCard = battle.reward_card as Card | null
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-5 max-w-sm mx-auto">
          <div className="text-6xl">{isDraw ? '🤝' : iWon ? '🏆' : '💔'}</div>
          <h2
            className={`text-5xl font-black ${isDraw ? 'text-gray-300' : iWon ? 'text-[#F5C518]' : 'text-red-400'}`}
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            {isDraw ? 'MATCH NUL' : iWon ? 'VICTOIRE !' : 'DÉFAITE'}
          </h2>
          {finalScore && (
            <p className="text-gray-400 text-xl font-black" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {finalScore.home} — {finalScore.away}
            </p>
          )}
          {rewardCard && (
            <div className={`w-full glass rounded-2xl p-4 flex flex-col items-center gap-3 border ${iWon ? 'border-[#F5C518]/30' : 'border-red-500/20'}`}>
              <p className={`text-xs font-bold ${iWon ? 'text-[#F5C518]' : 'text-red-400'}`}>
                {iWon ? '🎴 Carte volée à l\'adversaire' : '💸 Carte perdue'}
              </p>
              <GameCard card={rewardCard} owned size="md" />
              <p className="text-white font-bold text-sm">{rewardCard.name}</p>
              <p className="text-white/40 text-xs capitalize">{rewardCard.rarity}</p>
            </div>
          )}
          {iWon && (
            <ShareSheet
              url={`/share/battle/${battle.id}`}
              title={`J'ai battu ${them?.pseudo ?? 'mon adversaire'} en battle sur WorldSquad ! ⚔️${rewardCard ? ` J'ai volé la carte ${rewardCard.name} !` : ''}`}
              text={`Je viens de remporter un battle WorldSquad !${rewardCard ? ` Carte volée : ${rewardCard.name} (${rewardCard.rarity})` : ''} Affronte-moi sur WorldSquad ⚽`}
              label="Partager ma victoire"
              variant="gold"
              className="w-full"
            />
          )}
          <div className="flex gap-3 w-full">
            <Link
              href="/battles/matchmaking"
              className="flex-1 bg-[#F5C518] text-black font-black py-3 rounded-xl text-sm flex items-center justify-center gap-1"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              <Swords size={14} /> REJOUER
            </Link>
            <Link
              href="/battles"
              className="flex-1 border border-white/10 text-gray-400 py-3 rounded-xl text-sm font-semibold text-center hover:text-white transition-colors"
            >
              Mes battles
            </Link>
          </div>
        </div>
      )
    }
  }

  // ── Used cards across rounds ─────────────────────────────────────────────
  const usedCardIds = ROUND_PHASES.flatMap((rk) => {
    const rp = roundPicks[rk]
    if (!rp) return []
    return isChallenger ? (rp.challenger ? [rp.challenger] : []) : (rp.opponent ? [rp.opponent] : [])
  })

  // ── Current round info ───────────────────────────────────────────────────
  const currentRoundKey = phase as typeof ROUND_PHASES[number]
  const currentRoundPick = roundPicks[currentRoundKey]
  const iHavePicked = currentRoundPick
    ? (isChallenger ? !!currentRoundPick.challenger : !!currentRoundPick.opponent)
    : false

  // Score
  const myRoundWins = rounds.filter((r) => {
    return (r.winner === 'challenger') === isChallenger || r.winner === 'tie'
      ? r.winner === (isChallenger ? 'challenger' : 'opponent')
      : false
  }).length
  // Correct score calculation
  const challWins = rounds.filter((r) => r.winner === 'challenger').length
  const oppWins = rounds.filter((r) => r.winner === 'opponent').length
  const myScore = isChallenger ? challWins : oppWins
  const theirScore = isChallenger ? oppWins : challWins
  void myRoundWins

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: DRAFT
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'draft') {
    const alreadyDrafted = myDraft !== null
    return (
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <PhaseHeader phase="DRAFT" step={1} me={me} them={them} />

        {alreadyDrafted ? (
          <WaitingCard message={`En attente que ${them?.pseudo} finalise son draft…`} />
        ) : (
          <>
            <p className="text-white font-bold mb-1">Choisis tes 3 cartes de combat</p>
            <p className="text-gray-500 text-xs mb-4">
              Ces cartes sont en jeu — le perdant en abandonne une au gagnant.
              Sélectionné : {selectedDraft.length}/3
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1 mb-4">
              {myCards.map((card) => {
                const sel = selectedDraft.includes(card.id)
                return (
                  <motion.div key={card.id} whileTap={{ scale: 0.95 }}
                    className={`rounded-xl transition-all ${sel ? 'ring-2 ring-[#F5C518]' : ''}`}
                    onClick={() => {
                      if (sel) setSelectedDraft((d) => d.filter((id) => id !== card.id))
                      else if (selectedDraft.length < 3) setSelectedDraft((d) => [...d, card.id])
                    }}
                  >
                    <GameCard card={card} owned size="sm" selected={sel} onClick={() => {}} />
                  </motion.div>
                )
              })}
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={selectedDraft.length !== 3 || loading}
              onClick={() => post('draft', { cardIds: selectedDraft })}
              className="w-full bg-[#F5C518] disabled:opacity-40 text-black font-black py-4 rounded-xl text-lg"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {loading ? '…' : 'CONFIRMER MON DRAFT →'}
            </motion.button>
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: BAN
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'ban') {
    const myTurnToBan = isChallenger ? !battle.challenger_ban : (!!battle.challenger_ban && !battle.opponent_ban)
    const alreadyBanned = myBan !== null

    return (
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <PhaseHeader phase="BAN" step={2} me={me} them={them} />

        {/* Both drafts visible */}
        <DraftPreview myDraft={myDraft} theirDraft={theirDraft} me={me} them={them} />

        <div className="mb-4">
          {alreadyBanned ? (
            <WaitingCard message={`Tu as banni "${STAT_LABELS[myBan!] ?? myBan}". En attente de ${them?.pseudo}…`} />
          ) : myTurnToBan ? (
            <>
              <p className="text-white font-bold mb-1">Banne une stat adverse</p>
              <p className="text-gray-500 text-xs mb-4">Elle ne pourra pas être sélectionnée pour les rounds</p>
              <div className="grid grid-cols-3 gap-3">
                {ALL_STATS.map((stat) => {
                  const label = STAT_LABELS[stat]
                  const color = STAT_COLORS[label]
                  return (
                    <motion.button
                      key={stat}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => post('ban', { stat })}
                      disabled={loading}
                      className="glass rounded-xl p-4 flex flex-col items-center gap-1 border border-white/10 hover:border-red-500/40 transition-all group"
                    >
                      <span className="text-2xl font-black group-hover:text-red-400 transition-colors"
                        style={{ color, fontFamily: 'Bebas Neue, sans-serif' }}>{label}</span>
                      <span className="text-gray-600 text-xs capitalize">{stat}</span>
                    </motion.button>
                  )
                })}
              </div>
            </>
          ) : (
            <WaitingCard message={`${them?.pseudo} est en train de bannir une stat…`} />
          )}

          {/* Show already banned */}
          {(battle.challenger_ban || battle.opponent_ban) && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {battle.challenger_ban && (
                <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold">
                  🚫 {isChallenger ? 'Tu' : them?.pseudo} as banni {STAT_LABELS[battle.challenger_ban]}
                </span>
              )}
              {battle.opponent_ban && (
                <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold">
                  🚫 {!isChallenger ? 'Tu' : them?.pseudo} as banni {STAT_LABELS[battle.opponent_ban]}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: ROUNDS
  // ─────────────────────────────────────────────────────────────────────────
  if (ROUND_PHASES.includes(phase as typeof ROUND_PHASES[number])) {
    const roundNum = ROUND_PHASES.indexOf(phase as typeof ROUND_PHASES[number]) + 1
    const roundStat = currentRoundPick?.stat

    return (
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <PhaseHeader phase={`ROUND ${roundNum}/3`} step={2 + roundNum} me={me} them={them}
          score={`${myScore} - ${theirScore}`} />

        {/* Past rounds results */}
        {rounds.length > 0 && (
          <div className="mb-4 space-y-2">
            {rounds.map((r, i) => {
              const iWonRound = r.winner === (isChallenger ? 'challenger' : 'opponent')
              const myVal = isChallenger ? r.challenger_val : r.opponent_val
              const theirVal = isChallenger ? r.opponent_val : r.challenger_val
              const myCardName = isChallenger ? r.challenger_card?.name : r.opponent_card?.name
              const theirCardName = isChallenger ? r.opponent_card?.name : r.challenger_card?.name
              return (
                <AnimatePresence key={i}>
                  {i <= roundRevealed && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`glass rounded-xl p-3 flex items-center justify-between border ${iWonRound ? 'border-green-500/20' : 'border-red-500/10'}`}
                    >
                      <span className={`text-xs font-black ${iWonRound ? 'text-green-400' : 'text-red-400'}`}>
                        {iWonRound ? '✓' : '✗'} R{r.round}
                      </span>
                      <span className="text-xs text-gray-500">{r.label}</span>
                      <span className="text-xs text-gray-400">{myCardName}</span>
                      <span className={`text-sm font-black ${iWonRound ? 'text-green-400' : 'text-red-400'}`}>
                        {myVal} <span className="text-gray-600">vs</span> {theirVal}
                      </span>
                      <span className="text-xs text-gray-400">{theirCardName}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              )
            })}
          </div>
        )}

        {/* Stat reveal for current round */}
        {roundStat && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass rounded-2xl p-4 mb-4 text-center"
          >
            <p className="text-gray-500 text-xs mb-1">Stat du round {roundNum}</p>
            <div
              className="text-4xl font-black"
              style={{ color: STAT_COLORS[STAT_LABELS[roundStat]] ?? '#888', fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {STAT_LABELS[roundStat]}
            </div>
            <p className="text-gray-600 text-xs capitalize mt-1">{roundStat}</p>
          </motion.div>
        )}

        {/* My draft cards to pick from */}
        {!iHavePicked ? (
          <>
            <p className="text-white font-bold mb-1 text-sm">Joue une carte pour ce round</p>
            <p className="text-gray-500 text-xs mb-3">Chaque carte ne peut être jouée qu&apos;une seule fois</p>
            {!roundStat && <p className="text-gray-600 text-xs mb-3 italic">La stat sera révélée dès que tu joues</p>}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {(myDraft ?? []).map((card) => {
                const used = usedCardIds.includes(card.id)
                const sel = pickedCard === card.id
                return (
                  <motion.div
                    key={card.id}
                    whileTap={used ? {} : { scale: 0.95 }}
                    className={`rounded-xl transition-all ${used ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${sel ? 'ring-2 ring-[#F5C518]' : ''}`}
                    onClick={() => !used && setPickedCard(card.id)}
                  >
                    <GameCard card={card as unknown as Card} owned size="sm" selected={sel} onClick={() => {}} />
                    {used && <div className="text-center text-xs text-gray-600 mt-1">Utilisée</div>}
                  </motion.div>
                )
              })}
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={!pickedCard || loading}
              onClick={() => post('pick', { cardId: pickedCard })}
              className="w-full bg-[#F5C518] disabled:opacity-40 text-black font-black py-4 rounded-xl text-lg"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {loading ? '…' : 'JOUER CETTE CARTE →'}
            </motion.button>
          </>
        ) : (
          <WaitingCard message={`Carte jouée ✓ — En attente de ${them?.pseudo}…`} />
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: PICK REWARD
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'pick_reward') {
    const iWon = winnerId === currentUserId
    const loserDraft = (iWon
      ? (isChallenger ? battle.opponent_draft : battle.challenger_draft)
      : null) as DraftCard[] | null

    return (
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          {iWon ? (
            <>
              <div className="text-6xl mb-3">🏆</div>
              <h2 className="text-4xl font-black text-[#F5C518] mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                VICTOIRE !
              </h2>
              <p className="text-white mb-1">Choisis <span className="text-[#F5C518] font-black">1 carte</span> à récupérer</p>
              <p className="text-gray-500 text-xs">Elle rejoindra ta collection définitivement</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-3">💔</div>
              <h2 className="text-4xl font-black text-red-400 mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                DÉFAITE
              </h2>
              <p className="text-gray-400 text-sm">{them?.pseudo} choisit une de tes cartes…</p>
            </>
          )}
        </div>

        {/* Score recap */}
        <div className="glass rounded-xl p-3 mb-6 flex items-center justify-center gap-4">
          {rounds.map((r, i) => {
            const iWonRound = r.winner === (isChallenger ? 'challenger' : 'opponent')
            return (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                  iWonRound ? 'border-green-400 text-green-400' : 'border-red-400 text-red-400'
                }`}>
                  {STAT_LABELS[r.stat]}
                </div>
                <span className={`text-xs mt-0.5 ${iWonRound ? 'text-green-400' : 'text-red-400'}`}>
                  {isChallenger ? r.challenger_val : r.opponent_val}
                </span>
              </div>
            )
          })}
        </div>

        {iWon && loserDraft ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {loserDraft.map((card) => (
                <motion.div
                  key={card.id}
                  whileTap={{ scale: 0.95 }}
                  className={`rounded-xl cursor-pointer transition-all ${claimCard === card.id ? 'ring-2 ring-[#F5C518]' : ''}`}
                  onClick={() => setClaimCard(card.id)}
                >
                  <GameCard card={card as unknown as Card} owned size="md" selected={claimCard === card.id} onClick={() => {}} />
                </motion.div>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={!claimCard || loading}
              onClick={() => post('claim', { cardId: claimCard })}
              className="w-full bg-[#F5C518] disabled:opacity-40 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              {loading ? '…' : <><Check size={18} /> PRENDRE CETTE CARTE</>}
            </motion.button>
          </>
        ) : !iWon ? (
          <WaitingCard message={`${them?.pseudo} choisit sa carte récompense…`} />
        ) : null}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: FINISHED
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const iWon = winnerId === currentUserId
    const rewardCard = battle.reward_card_id as string | null
    const winnerDraft = (iWon ? myDraft : theirDraft) ?? []
    const claimedCard = winnerDraft.find((c) => c.id === rewardCard)

    return (
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-4">{iWon ? '🏆' : '💔'}</div>
        <h2
          className={`text-5xl font-black mb-2 ${iWon ? 'text-[#F5C518]' : 'text-red-400'}`}
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          {iWon ? 'VICTOIRE !' : 'DÉFAITE'}
        </h2>

        <div className="flex items-center justify-center gap-4 mb-6">
          <span className={`text-5xl font-black ${isChallenger ? 'text-[#F5C518]' : 'text-white'}`}
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {challWins}
          </span>
          <span className="text-gray-600 font-black" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>—</span>
          <span className={`text-5xl font-black ${!isChallenger ? 'text-[#F5C518]' : 'text-white'}`}
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {oppWins}
          </span>
        </div>

        {challWins === 3 || oppWins === 3 ? (
          <div className="flex items-center justify-center gap-1 text-orange-400 font-bold text-sm mb-4">
            <Flame size={14} /> Perfect — 3-0
          </div>
        ) : null}

        {claimedCard && (
          <div className="glass rounded-2xl p-4 mb-6 inline-flex flex-col items-center gap-2">
            <p className="text-gray-500 text-xs">{iWon ? 'Carte récupérée' : 'Carte perdue'}</p>
            <GameCard card={claimedCard as unknown as Card} owned size="md" />
            <p className="text-white font-bold text-sm">{claimedCard.name}</p>
          </div>
        )}

        <div className="flex gap-3 max-w-sm mx-auto">
          <Link
            href="/battles/matchmaking"
            className="flex-1 bg-[#F5C518] text-black font-black py-3 rounded-xl text-sm flex items-center justify-center gap-1"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            <Swords size={14} /> REJOUER
          </Link>
          <Link
            href="/battles"
            className="flex-1 border border-white/10 text-gray-400 hover:text-white py-3 rounded-xl text-sm font-semibold transition-colors text-center"
          >
            Mes battles
          </Link>
        </div>
      </div>
    )
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Phase inconnue : {phase}</p>
        <Link href="/battles" className="text-[#F5C518] text-sm">← Retour</Link>
      </div>
    </div>
  )
}

// ── TeamMatchPickReward ──────────────────────────────────────────────────────

function TeamMatchPickReward({
  battleId,
  iWon,
  them,
  finalScore,
}: {
  battleId: string
  iWon: boolean
  them: UserProfile
  finalScore: { home: number; away: number } | null
}) {
  const [cards, setCards] = useState<Card[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!iWon) return
    fetch(`/api/battles/${battleId}/opponent-cards`)
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
      .catch(() => setCards([]))
  }, [battleId, iWon])

  async function claimCard() {
    if (!selected) return
    setLoading(true)
    try {
      const res = await fetch(`/api/battles/${battleId}/steal-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: selected }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? 'Erreur')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const filtered = cards
    ? cards.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : null

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        {iWon ? (
          <>
            <div className="text-5xl mb-2">🏆</div>
            <h2
              className="text-4xl font-black text-[#F5C518] mb-1"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              VICTOIRE !
            </h2>
            {finalScore && (
              <p className="text-white/50 font-bold text-lg mb-1">
                {finalScore.home} — {finalScore.away}
              </p>
            )}
            <p className="text-white text-sm">
              Choisissez <span className="text-[#F5C518] font-black">1 carte</span> à voler à {them?.pseudo}
            </p>
            <p className="text-white/30 text-xs mt-1">Elle rejoindra votre collection définitivement</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-2">💔</div>
            <h2
              className="text-4xl font-black text-red-400 mb-1"
              style={{ fontFamily: 'Bebas Neue, sans-serif' }}
            >
              DÉFAITE
            </h2>
            {finalScore && (
              <p className="text-white/50 font-bold text-lg mb-1">
                {finalScore.home} — {finalScore.away}
              </p>
            )}
            <p className="text-white/50 text-sm">{them?.pseudo} est en train de choisir une de vos cartes…</p>
          </>
        )}
      </div>

      {iWon ? (
        <>
          {cards === null ? (
            <div className="flex items-center justify-center py-16">
              <Clock size={28} className="text-white/30 animate-pulse" />
            </div>
          ) : cards.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center border border-white/5 flex flex-col items-center gap-4">
              <p className="text-white/40 text-sm">L'adversaire ne possède aucune carte que vous n'avez pas déjà</p>
              <p className="text-white/20 text-xs">La victoire est déjà enregistrée ✓</p>
              <button
                onClick={async () => {
                  await fetch(`/api/battles/${battleId}/skip-reward`, { method: 'POST' })
                }}
                className="mt-2 px-6 py-2.5 rounded-xl bg-[#F5C518] text-black font-black text-sm hover:bg-[#ffd700] transition-all active:scale-95"
              >
                Terminer la partie →
              </button>
            </div>
          ) : (
            <>
              {/* Search */}
              {cards.length > 6 && (
                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher une carte…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#F5C518]/40"
                  />
                </div>
              )}

              {/* Cards grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1 mb-5">
                {(filtered ?? []).map((card) => (
                  <motion.div
                    key={card.id}
                    whileTap={{ scale: 0.95 }}
                    className={`rounded-xl cursor-pointer transition-all ${selected === card.id ? 'ring-2 ring-[#F5C518]' : ''}`}
                    onClick={() => setSelected(card.id)}
                  >
                    <GameCard card={card} owned size="sm" selected={selected === card.id} onClick={() => {}} />
                  </motion.div>
                ))}
                {filtered?.length === 0 && (
                  <p className="col-span-3 text-center text-white/30 text-sm py-6">Aucune carte trouvée</p>
                )}
              </div>

              {/* Selected preview + confirm */}
              {selected && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-3 mb-3 flex items-center gap-3 border border-[#F5C518]/20"
                >
                  <div className="w-12 shrink-0">
                    <GameCard
                      card={cards.find((c) => c.id === selected)!}
                      owned
                      size="sm"
                      onClick={() => {}}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">
                      {cards.find((c) => c.id === selected)?.name}
                    </p>
                    <p className="text-white/40 text-xs capitalize">
                      {cards.find((c) => c.id === selected)?.rarity}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white/60 p-1">
                    <X size={14} />
                  </button>
                </motion.div>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={!selected || loading}
                onClick={claimCard}
                className="w-full bg-[#F5C518] disabled:opacity-40 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                {loading ? '…' : <><Check size={18} /> VOLER CETTE CARTE</>}
              </motion.button>
            </>
          )}
        </>
      ) : (
        <WaitingCard message={`${them?.pseudo} est en train de choisir une de vos cartes…`} />
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PhaseHeader({ phase, step, me, them, score }: {
  phase: string; step: number; me: UserProfile; them: UserProfile; score?: string
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <Link href="/battles" className="text-gray-600 hover:text-white transition-colors">
        <ArrowLeft size={18} />
      </Link>
      <div className="text-center">
        <div className="text-xs text-gray-600 mb-0.5">DRAFT DUEL · Étape {step}/5</div>
        <div className="text-lg font-black text-[#F5C518]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {phase}
        </div>
        {score && <div className="text-sm font-black text-white mt-0.5">{score}</div>}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <span>{NATION_FLAGS[me?.nation] ?? '🌍'}</span>
        <Swords size={10} />
        <span>{NATION_FLAGS[them?.nation] ?? '🌍'}</span>
      </div>
    </div>
  )
}

function WaitingCard({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass rounded-2xl p-8 text-center"
    >
      <Clock size={32} className="text-gray-600 mx-auto mb-3 animate-pulse" />
      <p className="text-gray-400 text-sm">{message}</p>
    </motion.div>
  )
}

function DraftPreview({ myDraft, theirDraft, me, them }: {
  myDraft: DraftCard[] | null; theirDraft: DraftCard[] | null
  me: UserProfile; them: UserProfile
}) {
  return (
    <div className="glass rounded-2xl p-4 mb-4">
      <div className="grid grid-cols-2 gap-4">
        {[
          { draft: myDraft, label: `${me?.pseudo ?? 'Toi'} (toi)`, yours: true },
          { draft: theirDraft, label: them?.pseudo ?? 'Adversaire', yours: false },
        ].map(({ draft, label, yours }) => (
          <div key={label}>
            <p className={`text-xs font-bold mb-2 ${yours ? 'text-[#F5C518]' : 'text-gray-400'}`}>{label}</p>
            <div className="flex gap-1">
              {draft ? draft.map((c) => (
                <div key={c.id} className="flex-1">
                  <GameCard card={c as unknown as Card} owned size="sm" />
                </div>
              )) : (
                <div className="flex gap-1">
                  {[0,1,2].map((i) => (
                    <div key={i} className="flex-1 aspect-[2/3] rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Clock size={14} className="text-gray-700 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
