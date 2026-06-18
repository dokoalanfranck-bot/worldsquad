'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Lock, Circle, Clock, Target, Zap, Search, ChevronDown, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Match, Prediction } from '@/types'
import type { FlashChallenge } from '@/lib/flash-challenges'

interface PlayerOption {
  id: string
  name: string
  rarity: string
  image_url: string | null
  stats: Record<string, number | string>
  nation: string | null
}

interface Props {
  match: Match
  currentPrediction: Prediction | null
  groupPredictions: (Prediction & { user: { pseudo: string; photo_url: string | null; nation: string } | null })[]
  userId: string
  flashChallenge: FlashChallenge | null
  players: PlayerOption[]
}

const RARITY_COLOR: Record<string, string> = {
  Legend: '#F5C518',
  Epic:   '#A855F7',
  Rare:   '#00D4FF',
  Common: '#9CA3AF',
}
const RARITY_ORDER: Record<string, number> = { Legend: 4, Epic: 3, Rare: 2, Common: 1 }

// ── ScorePicker ────────────────────────────────────────────────────────────────
function ScorePicker({
  label, flag, value, onChange, disabled,
}: {
  label: string; flag: string; value: number
  onChange: (v: number) => void; disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-5xl">{flag}</div>
      <div className="font-black text-white text-lg text-center" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
        {label}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={disabled || value <= 0}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-black text-xl transition-colors"
        >−</button>
        <motion.div
          key={value}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
          style={{ boxShadow: '0 0 20px rgba(245,197,24,0.1)' }}
        >
          <span className="text-3xl font-black text-[#F5C518]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{value}</span>
        </motion.div>
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          disabled={disabled || value >= 20}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-black text-xl transition-colors"
        >+</button>
      </div>
    </div>
  )
}

// ── PlayerPicker ───────────────────────────────────────────────────────────────
function PlayerPicker({
  players, teamA, teamB, flagA, flagB, value, onChange, disabled,
}: {
  players: PlayerOption[]
  teamA: string; teamB: string
  flagA: string; flagB: string
  value: string
  onChange: (name: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'a' | 'b'>('all')

  const sorted = [...players]
    .filter(p => String(p.stats?.position ?? '').toUpperCase() !== 'COACH')
    .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0) || a.name.localeCompare(b.name))

  const filtered = sorted
    .filter(p => tab === 'all' ? true : tab === 'a' ? p.nation === teamA : p.nation === teamB)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const playersA = filtered.filter(p => p.nation === teamA)
  const playersB = filtered.filter(p => p.nation === teamB)

  const selectedPlayer = sorted.find(p => p.name === value)

  function select(name: string) {
    onChange(name === value ? '' : name)
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-50 transition-all"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm">⚽</span>
          {selectedPlayer ? (
            <span className="font-semibold text-sm" style={{ color: RARITY_COLOR[selectedPlayer.rarity] ?? '#fff' }}>
              {selectedPlayer.name}
            </span>
          ) : (
            <span className="text-white/30 text-sm">Choisir un buteur (optionnel)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedPlayer && !disabled && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onChange('') }}
              className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:bg-white/20 hover:text-white/70 text-xs transition-colors cursor-pointer"
            >×</span>
          )}
          {!disabled && <ChevronDown size={13} className="text-white/25" />}
        </div>
      </button>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
              onClick={() => { setOpen(false); setSearch('') }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-white/10 flex flex-col"
              style={{
                background: 'var(--bg-elevated)',
                maxHeight: '78vh',
                paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="px-5 pt-1 pb-3 flex-shrink-0">
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">Pronostic buteur</p>
                <h3 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  QUI VA MARQUER ?
                </h3>
              </div>

              {/* Search */}
              <div className="px-4 pb-2 flex-shrink-0">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8 focus-within:border-white/20 transition-colors">
                  <Search size={13} className="text-white/30 flex-shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un joueur…"
                    className="flex-1 bg-transparent text-white placeholder-white/25 text-sm focus:outline-none"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/50 text-sm leading-none">×</button>
                  )}
                </div>
              </div>

              {/* Team tabs */}
              <div className="px-4 pb-3 flex gap-2 flex-shrink-0">
                {([
                  { id: 'all', label: 'Tous' },
                  { id: 'a',   label: `${flagA} ${teamA}` },
                  { id: 'b',   label: `${flagB} ${teamB}` },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tab === t.id
                        ? 'bg-[#F5C518] text-black'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Player list */}
              <div className="overflow-y-auto px-4 pb-2 space-y-4">
                {filtered.length === 0 ? (
                  <p className="text-white/20 text-sm text-center py-10">Aucun joueur trouvé</p>
                ) : (
                  [
                    { team: teamA, flag: flagA, list: playersA },
                    { team: teamB, flag: flagB, list: playersB },
                  ]
                    .filter(g => g.list.length > 0)
                    .map(({ team, flag, list }) => (
                      <div key={team}>
                        <p className="text-white/20 text-[10px] uppercase tracking-widest mb-2 font-bold">
                          {flag} {team}
                        </p>
                        <div className="space-y-0.5">
                          {list.map(p => {
                            const isSelected = value === p.name
                            const pos = String(p.stats?.position ?? '').toUpperCase()
                            return (
                              <button
                                key={p.id}
                                onClick={() => select(p.name)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                                  isSelected
                                    ? 'bg-[#F5C518]/10 border border-[#F5C518]/25'
                                    : 'border border-transparent hover:bg-white/5'
                                }`}
                              >
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: RARITY_COLOR[p.rarity] ?? '#9CA3AF', boxShadow: isSelected ? `0 0 6px ${RARITY_COLOR[p.rarity]}66` : 'none' }}
                                />
                                <span className={`flex-1 text-sm font-semibold truncate ${isSelected ? 'text-[#F5C518]' : 'text-white'}`}>
                                  {p.name}
                                </span>
                                {pos && pos !== 'COACH' && (
                                  <span className="text-white/20 text-[10px] font-mono tabular-nums flex-shrink-0">{pos}</span>
                                )}
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-[#F5C518] flex items-center justify-center flex-shrink-0">
                                    <Check size={9} className="text-black" strokeWidth={3} />
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function MatchDetailClient({ match, currentPrediction, groupPredictions, userId, flashChallenge, players }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [scoreA, setScoreA] = useState(currentPrediction?.pred_score_a ?? 1)
  const [scoreB, setScoreB] = useState(currentPrediction?.pred_score_b ?? 1)
  const [scorer, setScorer] = useState(currentPrediction?.pred_scorer ?? '')
  const [loading, setLoading] = useState(false)

  const isLocked = match.status !== 'upcoming'
  const hasPrediction = !!currentPrediction

  async function handleSubmit() {
    if (isLocked) { toast.error('Les pronostics sont verrouillés — le match a commencé !'); return }
    setLoading(true)
    try {
      const payload = {
        user_id: userId,
        match_id: match.id,
        pred_score_a: scoreA,
        pred_score_b: scoreB,
        pred_scorer: scorer || null,
      }
      if (hasPrediction) {
        const { error } = await supabase.from('predictions').update(payload).eq('id', currentPrediction!.id)
        if (error) throw error
        toast.success('Pronostic mis à jour !')
      } else {
        const { error } = await supabase.from('predictions').insert(payload)
        if (error) throw error
        toast.success('Pronostic enregistré !')
        if (flashChallenge) {
          fetch('/api/flash-challenges/reward', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId: match.id }),
          })
            .then(r => r.json())
            .then((data: { active?: boolean; alreadyClaimed?: boolean; coins?: number }) => {
              if (data.active && !data.alreadyClaimed && data.coins)
                setTimeout(() => toast.success(`⚡ Défi Flash ! +${data.coins} coins bonus !`, { icon: '⚡', duration: 4000 }), 600)
            }).catch(() => {})
        }
        fetch('/api/missions/complete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'prediction' }),
        })
          .then(r => r.json())
          .then((data: { coins?: number; alreadyDone?: boolean }) => {
            if (!data.alreadyDone && data.coins) toast.success(`Mission du jour +${data.coins} coins !`, { icon: '🎯' })
          }).catch(() => {})
      }
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const matchDate = new Date(match.match_date)

  return (
    <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">

      {/* Match header */}
      <div className="glass-elevated rounded-2xl p-6 mb-6 text-center">
        <div className="flex items-center justify-between mb-2">
          {match.group_name && (
            <span className="text-xs text-gray-500 font-bold uppercase">Groupe {match.group_name}</span>
          )}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-auto ${
            match.status === 'live' ? 'text-green-400 bg-green-400/10 animate-pulse'
            : match.status === 'finished' ? 'text-gray-500 bg-white/5'
            : 'text-[#F5C518] bg-[#F5C518]/10'
          }`}>
            {match.status === 'live'
              ? <span className="flex items-center gap-1.5"><Circle size={7} fill="currentColor" /> EN DIRECT</span>
              : match.status === 'finished' ? 'Terminé'
              : <span className="flex items-center gap-1.5"><Clock size={11} /> À venir</span>
            }
          </span>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          {matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        {match.status !== 'upcoming' && match.score_a !== null && (
          <div className="text-5xl font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            <span>{match.flag_a ?? '🏳'}</span>
            <span className="mx-4 text-[#F5C518]">{match.score_a} — {match.score_b}</span>
            <span>{match.flag_b ?? '🏳'}</span>
          </div>
        )}
      </div>

      {/* Flash challenge banner */}
      {flashChallenge && match.status === 'upcoming' && !currentPrediction && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-6 border border-[#F5C518]/30 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.08), rgba(200,16,46,0.05))' }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,197,24,0.18)' }}
          >
            <Zap size={18} className="text-[#F5C518]" fill="currentColor" />
          </motion.div>
          <div>
            <p className="text-[#F5C518] font-black text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>⚡ DÉFI FLASH ACTIF</p>
            <p className="text-white/50 text-xs">
              Fais ton pronostic maintenant et reçois{' '}
              <span className="text-[#F5C518] font-bold">+{flashChallenge.bonus_coins} coins</span> en bonus instantané !
            </p>
          </div>
        </motion.div>
      )}

      {/* Prediction form */}
      <div className="glass-elevated rounded-2xl p-6 mb-6">
        <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          {isLocked ? 'TON PRONOSTIC' : hasPrediction ? 'MODIFIER TON PRONOSTIC' : 'FAIRE TON PRONOSTIC'}
        </h2>
        {isLocked && (
          <p className="flex items-center gap-1.5 text-red-400 text-sm mb-4 font-semibold">
            <Lock size={13} /> Pronostics verrouillés — match commencé
          </p>
        )}

        <div className="flex items-center justify-around py-6">
          <ScorePicker label={match.team_a} flag={match.flag_a ?? '🏳'} value={scoreA} onChange={setScoreA} disabled={isLocked} />
          <div className="text-4xl font-black text-gray-600" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>—</div>
          <ScorePicker label={match.team_b} flag={match.flag_b ?? '🏳'} value={scoreB} onChange={setScoreB} disabled={isLocked} />
        </div>

        {/* Scorer picker */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-white/30 uppercase tracking-wider">Buteur prédit</label>
            {scorer && (
              <span className="text-[10px] text-[#F5C518]/60 font-bold uppercase tracking-wide">+150 coins si correct</span>
            )}
          </div>
          {players.length > 0 ? (
            <PlayerPicker
              players={players}
              teamA={match.team_a}
              teamB={match.team_b}
              flagA={match.flag_a ?? '🏳'}
              flagB={match.flag_b ?? '🏳'}
              value={scorer}
              onChange={setScorer}
              disabled={isLocked}
            />
          ) : (
            <input
              type="text"
              value={scorer}
              onChange={e => setScorer(e.target.value)}
              disabled={isLocked}
              placeholder="ex: Mbappé"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/50 transition-all disabled:opacity-50"
            />
          )}
        </div>

        {/* Gain preview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {GAINS.map(g => (
            <div key={g.label} className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[#F5C518] font-black text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>+{g.coins}</div>
              <div className="text-gray-500 text-xs mt-0.5">{g.label}</div>
            </div>
          ))}
        </div>

        {!isLocked && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#F5C518] hover:bg-[#ffd700] disabled:opacity-50 text-black font-black py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', letterSpacing: '0.05em' }}
          >
            {loading ? 'ENREGISTREMENT...' : hasPrediction ? 'METTRE À JOUR' : 'VALIDER MON PRONOSTIC'}
          </button>
        )}

        {hasPrediction && currentPrediction.status !== 'pending' && (
          <div className={`mt-4 p-4 rounded-xl text-center font-bold ${
            currentPrediction.status === 'correct_score' ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : currentPrediction.status === 'correct_winner' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {currentPrediction.status === 'correct_score' && <span className="flex items-center justify-center gap-2"><Target size={15} /> Score exact ! +300</span>}
            {currentPrediction.status === 'correct_winner' && <span className="flex items-center justify-center gap-2"><CheckCircle2 size={15} /> Bon vainqueur ! +100</span>}
            {currentPrediction.status === 'wrong' && <span className="flex items-center justify-center gap-2"><XCircle size={15} /> Pas cette fois…</span>}
          </div>
        )}
      </div>

      {/* Group predictions */}
      {groupPredictions.length > 0 && (
        <div className="glass-elevated rounded-2xl p-6">
          <h3 className="text-xl font-black text-white mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            PRONOSTICS DU GROUPE ({groupPredictions.length})
          </h3>
          <div className="space-y-3">
            {groupPredictions.map(pred => (
              <div key={pred.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F5C518]/20 flex items-center justify-center text-sm font-bold text-white">
                    {pred.user?.pseudo?.slice(0, 1) ?? '?'}
                  </div>
                  <div>
                    <span className="text-white font-semibold text-sm">{pred.user?.pseudo}</span>
                    {pred.pred_scorer && (
                      <p className="text-white/25 text-xs">⚽ {pred.pred_scorer}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-[#F5C518]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    {pred.pred_score_a} — {pred.pred_score_b}
                  </span>
                  {pred.status !== 'pending' && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      pred.status === 'correct_score' ? 'text-green-400 bg-green-400/10'
                      : pred.status === 'correct_winner' ? 'text-blue-400 bg-blue-400/10'
                      : 'text-red-400 bg-red-400/10'
                    }`}>
                      {pred.status === 'correct_score' ? '+300' : pred.status === 'correct_winner' ? '+100' : '0'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const GAINS = [
  { label: 'Score exact',  coins: 300 },
  { label: 'Bon vainqueur', coins: 100 },
  { label: 'Bon buteur',   coins: 150 },
]
