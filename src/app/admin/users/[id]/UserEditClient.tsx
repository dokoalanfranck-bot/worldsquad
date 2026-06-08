'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Crown,
  Shield,
  Coins,
  Target,
  Swords,
  Layers,
  Trash2,
  Save,
  Loader2,
  Plus,
  AlertTriangle,
} from 'lucide-react'

interface UserEditClientProps {
  user: {
    id: string
    pseudo: string
    email: string
    nation: string | null
    coins: number
    level: string | null
    is_vip: boolean
    is_admin: boolean
    predictions_correct: number
    battles_won: number
    created_at: string
  }
  predictions: Array<{
    id: string
    pred_score_a: number
    pred_score_b: number
    status: string
    coins_won: number
    created_at: string
    match?: {
      team_a: string
      team_b: string
      flag_a: string | null
      flag_b: string | null
      score_a: number | null
      score_b: number | null
      status: string
    }
  }>
  battles: Array<{
    id: string
    coins_stake: number
    status: string
    winner_id: string | null
    created_at: string
    challenger?: { pseudo: string }
    opponent?: { pseudo: string }
  }>
  transactions: Array<{
    id: string
    amount: number
    reason: string | null
    created_at: string
  }>
  cardsCount: number
}

const PREDICTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'text-white/40' },
  correct_score: { label: 'Score exact ✓', color: 'text-green-400' },
  correct_winner: { label: 'Bon vainqueur ✓', color: 'text-blue-400' },
  wrong: { label: 'Mauvais', color: 'text-red-400' },
}

export function UserEditClient({ user, predictions, battles, transactions, cardsCount }: UserEditClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState({
    pseudo: user.pseudo,
    nation: user.nation ?? '',
    is_vip: user.is_vip,
    is_admin: user.is_admin,
    predictions_correct: user.predictions_correct,
    battles_won: user.battles_won,
  })
  const [coinsSet, setCoinsSet] = useState(user.coins.toString())
  const [coinsDelta, setCoinsDelta] = useState('')

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Erreur')
    router.refresh()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await patch(form)
      toast.success('Profil mis à jour')
    } catch {
      toast.error('Erreur sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSetCoins = async () => {
    try {
      await patch({ coins: parseInt(coinsSet) })
      toast.success('Coins mis à jour')
    } catch {
      toast.error('Erreur')
    }
  }

  const handleAddCoins = async () => {
    const delta = parseInt(coinsDelta)
    if (!delta) return
    try {
      await patch({ coins_delta: delta })
      toast.success(`${delta > 0 ? '+' : ''}${delta} coins`)
      setCoinsDelta('')
    } catch {
      toast.error('Erreur')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur')
      toast.success('Utilisateur supprimé')
      router.push('/admin/users')
    } catch {
      toast.error('Erreur suppression')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bebas text-3xl text-white">{user.pseudo}</h1>
          <p className="text-white/50 text-sm">{user.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {user.is_vip && <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs border border-yellow-500/20">VIP</span>}
          {user.is_admin && <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs border border-blue-500/20">Admin</span>}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Cartes', value: cardsCount, icon: Layers, color: 'text-purple-400' },
          { label: 'Pronostics', value: predictions.length, icon: Target, color: 'text-green-400' },
          { label: 'Battles', value: battles.length, icon: Swords, color: 'text-yellow-400' },
          { label: 'Coins', value: user.coins.toLocaleString(), icon: Coins, color: 'text-yellow-400' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/40 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Profile Form */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-white text-sm uppercase tracking-wider">Profil</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Pseudo</label>
            <input
              value={form.pseudo}
              onChange={(e) => setForm((f) => ({ ...f, pseudo: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Email (lecture seule)</label>
            <input
              value={user.email}
              readOnly
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/40 text-sm cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Nation</label>
            <input
              value={form.nation}
              onChange={(e) => setForm((f) => ({ ...f, nation: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Stats</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={form.predictions_correct}
                onChange={(e) => setForm((f) => ({ ...f, predictions_correct: parseInt(e.target.value) || 0 }))}
                placeholder="Pronos corrects"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="number"
                value={form.battles_won}
                onChange={(e) => setForm((f) => ({ ...f, battles_won: parseInt(e.target.value) || 0 }))}
                placeholder="Battles gagnés"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-3">
          <button
            onClick={() => setForm((f) => ({ ...f, is_vip: !f.is_vip }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              form.is_vip
                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            <Crown className="w-4 h-4" />
            VIP {form.is_vip ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setForm((f) => ({ ...f, is_admin: !f.is_admin }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              form.is_admin
                ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            <Shield className="w-4 h-4" />
            Admin {form.is_admin ? 'ON' : 'OFF'}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </button>
      </div>

      {/* Coins Management */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-white text-sm uppercase tracking-wider flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          Gestion des coins — actuel: <span className="text-yellow-400">{user.coins.toLocaleString()}</span>
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Définir montant exact</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={coinsSet}
                onChange={(e) => setCoinsSet(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleSetCoins}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Définir
              </button>
            </div>
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Ajouter / Soustraire</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={coinsDelta}
                onChange={(e) => setCoinsDelta(e.target.value)}
                placeholder="+500 ou -100"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleAddCoins}
                className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Predictions */}
      {predictions.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white text-sm">Derniers pronostics</h2>
          </div>
          <div className="divide-y divide-white/5">
            {predictions.map((p) => {
              const statusInfo = PREDICTION_STATUS_LABELS[p.status] ?? { label: p.status, color: 'text-white/40' }
              return (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-white/80">
                      {p.match?.flag_a} {p.match?.team_a} vs {p.match?.team_b} {p.match?.flag_b}
                    </p>
                    <p className="text-white/40 text-xs">
                      Pronostic: {p.pred_score_a} - {p.pred_score_b}
                      {p.match?.score_a !== null && ` · Résultat: ${p.match?.score_a} - ${p.match?.score_b}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</p>
                    {p.coins_won > 0 && <p className="text-yellow-400 text-xs">+{p.coins_won} coins</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-2">
            <Coins className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white text-sm">Dernières transactions</h2>
          </div>
          <div className="divide-y divide-white/5">
            {transactions.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="text-white/70 text-xs">{t.reason ?? '—'}</p>
                  <p className="text-white/40 text-xs">{new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`font-mono font-bold text-sm ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t.amount >= 0 ? '+' : ''}{t.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="glass rounded-xl p-6 border border-red-500/20">
        <h2 className="font-semibold text-red-400 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4" />
          Zone de danger
        </h2>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors border border-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer l&apos;utilisateur
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-red-300 text-sm">Cette action est irréversible. Confirmer la suppression de <strong>{user.pseudo}</strong> ?</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirmer la suppression
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
