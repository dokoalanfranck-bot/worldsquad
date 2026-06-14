'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Play, Square, Plus, Zap, Bell, Clock, RotateCcw, ChevronDown, ChevronUp, Video, Save, Loader2, Eye, Monitor, ExternalLink, RefreshCw, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}

function generateRoomName(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = 'ws-live-'
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface StreamConfig {
  youtube_url: string
  title: string
  subtitle: string
  is_active: boolean
  stream_type: 'jitsi' | 'youtube'
  room_name: string
  thumbnail_url: string
  starts_at: string
}

function StreamPanel() {
  const [config, setConfig] = useState<StreamConfig>({
    youtube_url: '', title: 'Match en Direct', subtitle: '',
    is_active: false, stream_type: 'jitsi', room_name: generateRoomName(),
    thumbnail_url: '', starts_at: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoId = extractYouTubeId(config.youtube_url)

  async function uploadThumbnail(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-thumbnail', { method: 'POST', body: fd })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const { url } = await res.json() as { url: string }
      setConfig((s) => ({ ...s, thumbnail_url: url }))
      toast.success('✓ Miniature uploadée')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    fetch('/api/admin/live-stream')
      .then((r) => r.json())
      .then((data: Partial<StreamConfig>) => {
        setConfig({
          youtube_url: data.youtube_url ?? '',
          title: data.title ?? 'Match en Direct',
          subtitle: data.subtitle ?? '',
          is_active: data.is_active ?? false,
          stream_type: (data.stream_type as 'jitsi' | 'youtube') ?? 'jitsi',
          room_name: data.room_name ?? generateRoomName(),
          thumbnail_url: data.thumbnail_url ?? '',
          starts_at: data.starts_at ? toLocalInput(data.starts_at) : '',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function buildPayload(cfg: StreamConfig) {
    return {
      ...cfg,
      starts_at: cfg.starts_at ? new Date(cfg.starts_at).toISOString() : null,
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/live-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(config)),
      })
      if (!res.ok) throw new Error()
      toast.success('✓ Configuration sauvegardée')
    } catch {
      toast.error('Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function toggle() {
    const next = { ...config, is_active: !config.is_active }
    setConfig(next)
    setToggling(true)
    try {
      const res = await fetch('/api/admin/live-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(next)),
      })
      if (!res.ok) throw new Error()
      toast.success(next.is_active ? '🔴 Stream activé — visible par tous les joueurs' : 'Stream désactivé')
    } catch {
      setConfig(config)
      toast.error('Erreur')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl border border-white/8 p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    )
  }

  const jitsiUrl = `https://meet.jit.si/${config.room_name}`

  return (
    <div className="glass rounded-2xl border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Stream en Direct</p>
            <p className="text-white/30 text-xs">Partage d&apos;écran ou live YouTube</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {config.is_active && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-red-400 text-[10px] font-bold tracking-widest">ACTIF</span>
            </div>
          )}
          <button
            onClick={toggle}
            disabled={toggling}
            title={config.is_active ? 'Désactiver le stream' : 'Activer le stream'}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 disabled:opacity-50 ${
              config.is_active ? 'bg-red-500' : 'bg-white/10'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${
              config.is_active ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-white/5 px-5">
        {(['jitsi', 'youtube'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setConfig((s) => ({ ...s, stream_type: m }))}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
              config.stream_type === m
                ? 'border-[#F5C518] text-[#F5C518]'
                : 'border-transparent text-white/30 hover:text-white/55'
            }`}
          >
            {m === 'jitsi'
              ? <><Monitor className="w-3.5 h-3.5" /> Partage Écran (Jitsi)</>
              : <><Video className="w-3.5 h-3.5" /> YouTube</>
            }
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {config.stream_type === 'jitsi' ? (
          <div className="space-y-3">
            <div>
              <label className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
                Nom de la salle Jitsi
              </label>
              <div className="flex gap-2">
                <input
                  value={config.room_name}
                  onChange={(e) => setConfig((s) => ({ ...s, room_name: e.target.value }))}
                  placeholder="ws-live-abc12345"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5C518]/40 transition-colors font-mono"
                />
                <button
                  onClick={() => setConfig((s) => ({ ...s, room_name: generateRoomName() }))}
                  title="Générer un nouveau nom"
                  className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <a
              href={jitsiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-300 hover:bg-blue-500/25 font-bold text-sm transition-colors"
            >
              <Monitor className="w-4 h-4" />
              Ouvrir Jitsi et partager mon écran
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="bg-white/3 border border-white/6 rounded-xl p-3.5 space-y-1.5">
              <p className="text-white/50 text-xs font-bold mb-2">Comment ça marche :</p>
              <p className="text-white/30 text-[11px] leading-relaxed">1. Clique &quot;Ouvrir Jitsi&quot; → une salle s&apos;ouvre dans un nouvel onglet</p>
              <p className="text-white/30 text-[11px] leading-relaxed">2. Dans Jitsi, clique <span className="text-white/50 font-medium">Partager l&apos;écran</span> et sélectionne la fenêtre BeIN Sports</p>
              <p className="text-white/30 text-[11px] leading-relaxed">3. Sauvegarde puis active le toggle → les joueurs verront ton stream sur /live</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
                URL YouTube du live
              </label>
              <input
                value={config.youtube_url}
                onChange={(e) => setConfig((s) => ({ ...s, youtube_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-red-500/40 transition-colors"
              />
              {config.youtube_url && (
                <p className={`text-xs mt-1 ${videoId ? 'text-green-400/70' : 'text-red-400/70'}`}>
                  {videoId ? `✓ ID détecté : ${videoId}` : '✗ URL YouTube non reconnue'}
                </p>
              )}
            </div>
            {videoId ? (
              <div className="relative rounded-xl overflow-hidden bg-black border border-white/8" style={{ paddingBottom: '56.25%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  alt="YouTube thumbnail"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    if (!target.src.includes('hqdefault')) {
                      target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    }
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-14 h-14 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl bg-white/3 border border-white/6 flex items-center justify-center" style={{ paddingBottom: '56.25%' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-white/20 text-xs">Colle une URL YouTube valide</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Common: Title, Subtitle, Thumbnail, Starts At, Save, View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1 border-t border-white/5">
          <div>
            <label className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
              Titre du live
            </label>
            <input
              value={config.title}
              onChange={(e) => setConfig((s) => ({ ...s, title: e.target.value }))}
              placeholder="Match en Direct"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>
          <div>
            <label className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
              Sous-titre (optionnel)
            </label>
            <input
              value={config.subtitle}
              onChange={(e) => setConfig((s) => ({ ...s, subtitle: e.target.value }))}
              placeholder="France 🇫🇷 vs 🇪🇸 Espagne · Demi-finale"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
              Miniature
            </label>
            <div className="flex gap-2">
              <input
                value={config.thumbnail_url}
                onChange={(e) => setConfig((s) => ({ ...s, thumbnail_url: e.target.value }))}
                placeholder="URL ou uploader →"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 disabled:opacity-50 text-xs font-bold transition-colors whitespace-nowrap"
              >
                {uploading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Upload className="w-3.5 h-3.5" />
                }
                {!uploading && 'Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadThumbnail(f) }}
              />
            </div>
            {config.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.thumbnail_url}
                alt="Miniature"
                className="mt-2 w-full h-20 object-cover rounded-xl border border-white/8"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </div>
          <div>
            <label className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
              Début du match (compte à rebours)
            </label>
            <input
              type="datetime-local"
              value={config.starts_at}
              onChange={(e) => setConfig((s) => ({ ...s, starts_at: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/25 transition-colors [color-scheme:dark]"
            />
            <p className="text-white/20 text-[10px] mt-1">
              Affiche un compte à rebours sur /live avant le début
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#F5C518] text-black font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#FFD700] transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            SAUVEGARDER
          </button>
          <a
            href="/live"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 text-sm flex items-center gap-2 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Voir
          </a>
        </div>
      </div>
    </div>
  )
}

interface Match {
  id: string
  team_a: string
  team_b: string
  flag_a: string | null
  flag_b: string | null
  match_date: string
  score_a: number | null
  score_b: number | null
  status: string
  phase: string | null
}

interface GoalEvent {
  minute: number
  team: 'a' | 'b'
  scorer: string
}

interface MatchState {
  half: 1 | 2
  halftimePausedAt: number | null
  startedAt: number
  events: GoalEvent[]
}

interface Props {
  initialLive: Match[]
  initialUpcoming: Match[]
  cronEnabled: boolean
}

const LS_KEY = (id: string) => `live_ctrl_${id}`

function loadMatchState(matchId: string, startedAt?: number): MatchState {
  try {
    const raw = localStorage.getItem(LS_KEY(matchId))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { half: 1, halftimePausedAt: null, startedAt: startedAt ?? Date.now(), events: [] }
}

function saveMatchState(matchId: string, state: MatchState) {
  localStorage.setItem(LS_KEY(matchId), JSON.stringify(state))
}

function useMatchMinute(state: MatchState): number {
  const [minute, setMinute] = useState(0)
  useEffect(() => {
    function calc() {
      if (state.halftimePausedAt) { setMinute(45); return }
      const elapsed = Math.floor((Date.now() - state.startedAt) / 60000)
      const base = state.half === 2 ? 45 : 0
      setMinute(Math.min(state.half === 1 ? 45 : 90, base + elapsed))
    }
    calc()
    const t = setInterval(calc, 10000)
    return () => clearInterval(t)
  }, [state])
  return minute
}

function LiveMatchCard({
  match,
  onFinish,
}: {
  match: Match
  onFinish: (id: string) => void
}) {
  const [pending, setPending] = useState(false)
  const [scores, setScores] = useState({ a: match.score_a ?? 0, b: match.score_b ?? 0 })
  const [scorerInput, setScorerInput] = useState<{ team: 'a' | 'b' } | null>(null)
  const [scorerName, setScorerName] = useState('')
  const [matchState, setMatchState] = useState<MatchState>(() => loadMatchState(match.id, Date.now()))
  const [showEvents, setShowEvents] = useState(false)
  const minute = useMatchMinute(matchState)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scorerInput && inputRef.current) inputRef.current.focus()
  }, [scorerInput])

  function updateState(updater: (s: MatchState) => MatchState) {
    setMatchState((prev) => {
      const next = updater(prev)
      saveMatchState(match.id, next)
      return next
    })
  }

  async function patchMatch(fields: Record<string, unknown>) {
    setPending(true)
    try {
      const res = await fetch(`/api/admin/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Erreur de mise à jour')
    } finally {
      setPending(false)
    }
  }

  async function confirmGoal(team: 'a' | 'b') {
    const scorer = scorerName.trim() || 'Inconnu'
    setScorerInput(null)
    setScorerName('')

    const newA = team === 'a' ? scores.a + 1 : scores.a
    const newB = team === 'b' ? scores.b + 1 : scores.b
    setScores({ a: newA, b: newB })

    updateState((s) => ({
      ...s,
      events: [...s.events, { minute, team, scorer: scorerName.trim() || '' }],
    }))

    toast.success(`⚽ But de ${scorer} (${minute}')`, { icon: '⚽' })

    await patchMatch({
      score_a: newA,
      score_b: newB,
      _scorer: scorerName.trim() || undefined,
    })
  }

  async function undoGoal(team: 'a' | 'b') {
    const current = team === 'a' ? scores.a : scores.b
    if (current <= 0) return
    const newA = team === 'a' ? scores.a - 1 : scores.a
    const newB = team === 'b' ? scores.b - 1 : scores.b
    setScores({ a: newA, b: newB })
    updateState((s) => ({ ...s, events: s.events.slice(0, -1) }))
    await patchMatch({ score_a: newA, score_b: newB })
    toast('But annulé', { icon: '↩️' })
  }

  function toggleHalfTime() {
    if (matchState.halftimePausedAt) {
      // Reprendre la 2e mi-temps
      updateState((s) => ({ ...s, half: 2, halftimePausedAt: null, startedAt: Date.now() }))
      toast('▶️ 2e mi-temps — reprise !')
    } else {
      // Pause mi-temps
      updateState((s) => ({ ...s, halftimePausedAt: Date.now() }))
      toast('⏸️ Mi-temps')
    }
  }

  async function finishMatch() {
    await patchMatch({ status: 'finished', _trigger_calculate: true })
    localStorage.removeItem(LS_KEY(match.id))
    onFinish(match.id)
    toast.success(`🏁 ${match.team_a} ${scores.a}-${scores.b} ${match.team_b} — Terminé !`)
  }

  const isHalfTime = !!matchState.halftimePausedAt
  const allEvents = matchState.events

  return (
    <div className="glass rounded-2xl border border-red-500/20 bg-red-500/3 overflow-hidden">
      {/* Match header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Clock size={11} />
          <span className="font-mono font-bold text-white/60">{minute}&apos;</span>
          {isHalfTime && (
            <span className="text-yellow-400 font-bold text-xs px-1.5 py-0.5 rounded bg-yellow-500/10">MI-TEMPS</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Teams & score */}
      <div className="flex items-center gap-3 px-5 pb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-3xl">{match.flag_a ?? '🏳'}</span>
          <span className="text-white font-bold text-sm leading-tight">{match.team_a}</span>
        </div>
        <div className="font-bebas text-5xl text-white tabular-nums text-center min-w-[100px]">
          {scores.a} — {scores.b}
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-white font-bold text-sm leading-tight text-right">{match.team_b}</span>
          <span className="text-3xl">{match.flag_b ?? '🏳'}</span>
        </div>
      </div>

      {/* Scorer input */}
      {scorerInput && (
        <div className="mx-5 mb-3 flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-[#F5C518]/30">
          <span className="text-lg">⚽</span>
          <input
            ref={inputRef}
            value={scorerName}
            onChange={(e) => setScorerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmGoal(scorerInput.team)}
            placeholder="Nom du buteur (facultatif)"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
          />
          <button
            onClick={() => confirmGoal(scorerInput.team)}
            className="px-3 py-1 rounded-lg bg-[#F5C518] text-black text-xs font-black"
          >
            ✓ Confirmer
          </button>
          <button
            onClick={() => { setScorerInput(null); setScorerName('') }}
            className="text-white/30 hover:text-white/60 text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Score controls */}
      <div className="grid grid-cols-3 gap-3 px-5 pb-3">
        {/* Team A */}
        <div className="flex gap-1.5">
          <button
            onClick={() => undoGoal('a')}
            disabled={pending || scores.a <= 0}
            title="Annuler dernier but"
            className="flex-shrink-0 w-9 h-10 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 flex items-center justify-center transition-colors"
          >
            <RotateCcw size={13} className="text-white/50" />
          </button>
          <button
            onClick={() => setScorerInput({ team: 'a' })}
            disabled={pending || !!scorerInput}
            className="flex-1 h-10 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 text-blue-400 font-black text-xs flex items-center justify-center gap-1 transition-colors"
          >
            <Plus size={12} /> BUT
          </button>
        </div>

        {/* Center controls */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={toggleHalfTime}
            disabled={pending}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center transition-colors ${
              isHalfTime
                ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {isHalfTime ? '▶ REPRENDRE' : '⏸ MI-TEMPS'}
          </button>
        </div>

        {/* Team B */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setScorerInput({ team: 'b' })}
            disabled={pending || !!scorerInput}
            className="flex-1 h-10 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 text-blue-400 font-black text-xs flex items-center justify-center gap-1 transition-colors"
          >
            <Plus size={12} /> BUT
          </button>
          <button
            onClick={() => undoGoal('b')}
            disabled={pending || scores.b <= 0}
            title="Annuler dernier but"
            className="flex-shrink-0 w-9 h-10 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 flex items-center justify-center transition-colors"
          >
            <RotateCcw size={13} className="text-white/50" />
          </button>
        </div>
      </div>

      {/* Events log */}
      {allEvents.length > 0 && (
        <div className="mx-5 mb-3">
          <button
            onClick={() => setShowEvents((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            {showEvents ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {allEvents.length} événement{allEvents.length > 1 ? 's' : ''}
          </button>
          {showEvents && (
            <div className="mt-2 space-y-1">
              {allEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                  <span className="font-mono w-7 text-right text-white/30">{ev.minute}&apos;</span>
                  <span>⚽</span>
                  <span className="text-white/70">{ev.scorer || 'Inconnu'}</span>
                  <span className="text-white/30">({ev.team === 'a' ? match.team_a : match.team_b})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Finish button */}
      <div className="px-5 pb-5">
        <button
          onClick={finishMatch}
          disabled={pending}
          className="w-full py-2.5 rounded-xl bg-green-500/15 border border-green-500/25 hover:bg-green-500/25 disabled:opacity-40 text-green-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Square size={13} /> TERMINER LE MATCH
          <span className="text-green-400/50 text-xs ml-1">· push auto + pronostics</span>
        </button>
      </div>
    </div>
  )
}

export function LiveControlClient({ initialLive, initialUpcoming, cronEnabled }: Props) {
  const supabase = createClient()
  const [live, setLive] = useState<Match[]>(initialLive)
  const [upcoming, setUpcoming] = useState<Match[]>(initialUpcoming)
  const [startingId, setStartingId] = useState<string | null>(null)

  useEffect(() => {
    const ch = supabase
      .channel('admin-live-ctrl')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
        const m = payload.new as Match
        if (m.status === 'live') {
          setLive((prev) => {
            const exists = prev.find((x) => x.id === m.id)
            return exists ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev]
          })
          setUpcoming((prev) => prev.filter((x) => x.id !== m.id))
        } else if (m.status === 'finished') {
          setLive((prev) => prev.filter((x) => x.id !== m.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  async function startMatch(matchId: string) {
    setStartingId(matchId)
    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'live', score_a: 0, score_b: 0 }),
      })
      if (!res.ok) throw new Error()
      toast.success('⚽ Match démarré ! Push envoyé à tous les joueurs', { duration: 4000 })
    } catch {
      toast.error('Erreur')
    } finally {
      setStartingId(null)
    }
  }

  function handleFinish(matchId: string) {
    setLive((prev) => prev.filter((m) => m.id !== matchId))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h1 className="font-bebas text-4xl text-white">LIVE CONTROL</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Bell size={12} />
          <span>Push automatique activé sur chaque action</span>
        </div>
      </div>

      {/* Stream panel */}
      <StreamPanel />

      {/* Status bar */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
        cronEnabled
          ? 'bg-green-500/5 border-green-500/20 text-green-400'
          : 'bg-blue-500/5 border-blue-500/20 text-blue-300'
      }`}>
        <Zap size={14} />
        {cronEnabled
          ? 'Sync auto API-Football active · scores mis à jour toutes les minutes'
          : 'Mode manuel · Gère les scores depuis ce panel · Les push sont envoyés automatiquement'}
      </div>

      {/* Live matches */}
      <div>
        <h2 className="font-bebas text-2xl text-red-400 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          EN DIRECT ({live.length})
        </h2>

        {live.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center border border-white/5">
            <p className="text-white/30 text-sm">Aucun match en direct</p>
          </div>
        ) : (
          <div className="space-y-4">
            {live.map((match) => (
              <LiveMatchCard key={match.id} match={match} onFinish={handleFinish} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-[#F5C518] mb-4">PROCHAINS MATCHS</h2>
          <div className="space-y-2">
            {upcoming.map((match) => (
              <div key={match.id} className="glass rounded-xl p-4 border border-white/5 flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xl">{match.flag_a ?? '🏳'}</span>
                  <span className="text-white font-semibold text-sm truncate">{match.team_a}</span>
                  <span className="text-white/30 text-xs">vs</span>
                  <span className="text-white font-semibold text-sm truncate">{match.team_b}</span>
                  <span className="text-xl">{match.flag_b ?? '🏳'}</span>
                </div>
                <span className="text-white/40 text-sm flex-shrink-0">
                  {new Date(match.match_date).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
                <button
                  onClick={() => startMatch(match.id)}
                  disabled={startingId === match.id}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-40 text-red-400 text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Play size={13} /> DÉMARRER
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {live.length === 0 && upcoming.length === 0 && (
        <div className="glass rounded-xl p-10 text-center border border-white/5">
          <p className="text-white/30 text-sm">Aucun match programmé</p>
          <a href="/admin/matches" className="text-[#F5C518] text-sm hover:underline mt-2 inline-block">
            Gérer les matchs →
          </a>
        </div>
      )}
    </div>
  )
}
