'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Target,
  RefreshCw,
  Save,
  RotateCcw,
  CheckCircle,
  XCircle,
  Users,
  Trophy,
  Star,
  Coins,
} from 'lucide-react'
import Image from 'next/image'

interface MissionUser {
  id: string
  pseudo: string
  photo_url: string | null
  coins: number
}

interface MissionRow {
  id: string
  user_id: string
  date: string
  prediction_done: boolean
  pack_done: boolean
  battle_won: boolean
  bonus_claimed: boolean
  user: MissionUser | null
}

interface MissionStats {
  total_users: number
  prediction_done: number
  pack_done: number
  battle_won: number
  bonus_claimed: number
  all_complete: number
}

interface MissionConfig {
  prediction_coins: number
  pack_coins: number
  battle_coins: number
  bonus_coins: number
}

export default function AdminMissionsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [missions, setMissions] = useState<MissionRow[]>([])
  const [stats, setStats] = useState<MissionStats | null>(null)
  const [config, setConfig] = useState<MissionConfig>({
    prediction_coins: 300,
    pack_coins: 30,
    battle_coins: 300,
    bonus_coins: 200,
  })
  const [configDraft, setConfigDraft] = useState<MissionConfig>({
    prediction_coins: 300,
    pack_coins: 30,
    battle_coins: 300,
    bonus_coins: 200,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'stats' | 'config'>('stats')
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/missions?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setStats(data.stats)
      setMissions(data.missions ?? [])
      if (data.config) {
        const cfg = {
          prediction_coins: data.config.prediction_coins,
          pack_coins: data.config.pack_coins,
          battle_coins: data.config.battle_coins,
          bonus_coins: data.config.bonus_coins,
        }
        setConfig(cfg)
        setConfigDraft(cfg)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function saveConfig() {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/missions/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configDraft),
      })
      if (res.ok) {
        const data = await res.json()
        const cfg = {
          prediction_coins: data.prediction_coins,
          pack_coins: data.pack_coins,
          battle_coins: data.battle_coins,
          bonus_coins: data.bonus_coins,
        }
        setConfig(cfg)
        setSaveMsg('Configuration sauvegardée !')
      } else {
        setSaveMsg('Erreur lors de la sauvegarde')
      }
    } finally {
      setSaving(false)
    }
  }

  async function resetUser(userId: string) {
    setResetting(userId)
    try {
      await fetch(`/api/admin/missions/${userId}/reset`, { method: 'POST' })
      await loadData()
    } finally {
      setResetting(null)
    }
  }

  const filteredMissions = missions.filter((m) => {
    if (!search) return true
    const pseudo = m.user?.pseudo?.toLowerCase() ?? ''
    return pseudo.includes(search.toLowerCase())
  })

  const STAT_CARDS = [
    {
      label: 'Utilisateurs actifs',
      value: stats?.total_users ?? 0,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Pronostics faits',
      value: stats?.prediction_done ?? 0,
      icon: Target,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Packs ouverts',
      value: stats?.pack_done ?? 0,
      icon: Star,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Battles gagnées',
      value: stats?.battle_won ?? 0,
      icon: Trophy,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Bonus réclamés',
      value: stats?.bonus_claimed ?? 0,
      icon: Coins,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Tout complété',
      value: stats?.all_complete ?? 0,
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Missions du jour</h1>
            <p className="text-sm text-white/40">Gestion des missions quotidiennes</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['stats', 'config'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {tab === 'stats' ? 'Statistiques & Joueurs' : 'Configuration'}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {STAT_CARDS.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className={`rounded-xl p-4 ${s.bg} border border-white/5`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${s.color}`}>{loading ? '…' : s.value}</p>
                  <p className="text-xs text-white/40 mt-1">{s.label}</p>
                </div>
              )
            })}
          </div>

          {/* User list */}
          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
              <h2 className="font-semibold text-white">Joueurs actifs aujourd'hui</h2>
              <input
                type="text"
                placeholder="Rechercher un pseudo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 w-48"
              />
            </div>

            {loading ? (
              <div className="p-8 text-center text-white/30">Chargement…</div>
            ) : filteredMissions.length === 0 ? (
              <div className="p-8 text-center text-white/30">Aucune mission pour aujourd'hui</div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredMissions.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02]">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                      {m.user?.photo_url ? (
                        <Image src={m.user.photo_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                          {m.user?.pseudo?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </div>

                    {/* Pseudo + coins */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {m.user?.pseudo ?? m.user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-white/40">{m.user?.coins ?? 0} coins</p>
                    </div>

                    {/* Mission badges */}
                    <div className="flex items-center gap-2">
                      <MissionBadge done={m.prediction_done} label="Pronos" />
                      <MissionBadge done={m.pack_done} label="Pack" />
                      <MissionBadge done={m.battle_won} label="Battle" />
                      <MissionBadge done={m.bonus_claimed} label="Bonus" isBonus />
                    </div>

                    {/* Reset button */}
                    <button
                      onClick={() => resetUser(m.user_id)}
                      disabled={resetting === m.user_id}
                      title="Réinitialiser les missions"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${resetting === m.user_id ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="max-w-lg space-y-6">
          <div className="glass rounded-2xl border border-white/5 p-6 space-y-5">
            <h2 className="font-semibold text-white">Récompenses en coins</h2>
            <p className="text-sm text-white/40">
              Ces valeurs s'appliquent aux nouvelles completions de missions. Les missions déjà complétées ne sont pas affectées.
            </p>

            <ConfigField
              label="Pronostic"
              description="Coins accordés pour faire un pronostic"
              value={configDraft.prediction_coins}
              onChange={(v) => setConfigDraft((d) => ({ ...d, prediction_coins: v }))}
              color="emerald"
            />
            <ConfigField
              label="Pack ouvert"
              description="Coins accordés pour ouvrir un pack"
              value={configDraft.pack_coins}
              onChange={(v) => setConfigDraft((d) => ({ ...d, pack_coins: v }))}
              color="yellow"
            />
            <ConfigField
              label="Battle gagnée"
              description="Coins accordés pour gagner une battle"
              value={configDraft.battle_coins}
              onChange={(v) => setConfigDraft((d) => ({ ...d, battle_coins: v }))}
              color="orange"
            />
            <ConfigField
              label="Bonus complet"
              description="Coins bonus si toutes les missions sont complètes"
              value={configDraft.bonus_coins}
              onChange={(v) => setConfigDraft((d) => ({ ...d, bonus_coins: v }))}
              color="purple"
            />

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => setConfigDraft(config)}
                className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
              >
                Annuler
              </button>
              {saveMsg && (
                <span className={`text-sm ${saveMsg.includes('Erreur') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>

          {/* Current summary */}
          <div className="glass rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-medium text-white/60 mb-4">Configuration actuelle en base</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Pronostic', value: config.prediction_coins, color: 'text-emerald-400' },
                { label: 'Pack', value: config.pack_coins, color: 'text-yellow-400' },
                { label: 'Battle', value: config.battle_coins, color: 'text-orange-400' },
                { label: 'Bonus complet', value: config.bonus_coins, color: 'text-purple-400' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-white/5 p-3">
                  <p className="text-xs text-white/40">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value} coins</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MissionBadge({
  done,
  label,
  isBonus = false,
}: {
  done: boolean
  label: string
  isBonus?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        done
          ? isBonus
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-white/5 text-white/25 border border-white/10'
      }`}
    >
      {done ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </div>
  )
}

function ConfigField({
  label,
  description,
  value,
  onChange,
  color,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
  color: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={9999}
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className={`w-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-right font-mono text-sm focus:outline-none focus:border-${color}-500/50 text-white`}
        />
        <span className="text-xs text-white/40 w-10">coins</span>
      </div>
    </div>
  )
}
