'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Save, Loader2, ArrowLeft, Upload, X } from 'lucide-react'

interface Card {
  id?: string
  name: string
  type: string
  rarity: string
  image_url: string | null
  nation: string | null
  description: string | null
  stats: Record<string, number | string> | null
}

interface CardFormClientProps {
  card?: Card
  ownersCount?: number
}

const STAT_KEYS = ['pace', 'shooting', 'passing', 'defending', 'dribbling', 'physical'] as const

const RARITY_COLORS: Record<string, string> = {
  Common: '#9CA3AF',
  Rare: '#00D4FF',
  Epic: '#A855F7',
  Legend: '#F5C518',
}

export function CardFormClient({ card, ownersCount = 0 }: CardFormClientProps) {
  const router = useRouter()
  const isEdit = !!card?.id
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: card?.name ?? '',
    type: card?.type ?? 'player',
    rarity: card?.rarity ?? 'Common',
    image_url: card?.image_url ?? '',
    nation: card?.nation ?? '',
    description: card?.description ?? '',
    position: (card?.stats as Record<string, unknown>)?.position as string ?? '',
  })

  const [stats, setStats] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {}
    for (const key of STAT_KEYS) {
      s[key] = typeof card?.stats?.[key] === 'number' ? (card.stats[key] as number) : 50
    }
    return s
  })

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))
  const updateStat = (key: string, value: number) => setStats((s) => ({ ...s, [key]: value }))

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-card-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur upload')
      update('image_url', data.url)
      toast.success('Image uploadée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    setSaving(true)
    try {
      const body = {
        name: form.name,
        type: form.type,
        rarity: form.rarity,
        image_url: form.image_url || null,
        nation: form.nation || null,
        description: form.description || null,
        stats: {
          ...stats,
          position: form.position || undefined,
        },
      }

      let res: Response
      if (isEdit) {
        res = await fetch(`/api/admin/cards/${card!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/admin/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')

      toast.success(isEdit ? 'Carte mise à jour' : 'Carte créée')
      if (!isEdit) {
        router.push(`/admin/cards/${data.id}`)
      } else {
        router.refresh()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const rarityColor = RARITY_COLORS[form.rarity] ?? '#fff'

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/cards" className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bebas text-3xl text-white">
            {isEdit ? `Modifier "${card!.name}"` : 'Nouvelle carte'}
          </h1>
          {isEdit && ownersCount > 0 && (
            <p className="text-white/50 text-sm">{ownersCount} possesseur{ownersCount !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Nom *</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Nom de la carte"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                <option value="player" className="bg-[#12121f]">Joueur</option>
                <option value="nation" className="bg-[#12121f]">Nation</option>
                <option value="trophy" className="bg-[#12121f]">Trophée</option>
                <option value="event" className="bg-[#12121f]">Évènement</option>
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Rareté</label>
              <select
                value={form.rarity}
                onChange={(e) => update('rarity', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                <option value="Common" className="bg-[#12121f]">Common</option>
                <option value="Rare" className="bg-[#12121f]">Rare</option>
                <option value="Epic" className="bg-[#12121f]">Epic</option>
                <option value="Legend" className="bg-[#12121f]">Legend</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Image</label>
            <div className="flex gap-2">
              <input
                value={form.image_url}
                onChange={(e) => update('image_url', e.target.value)}
                placeholder="https://…"
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => update('image_url', '')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                  title="Effacer l'image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Upload…' : 'Fichier'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {(form.type === 'nation' || form.type === 'player') && (
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Nation / Drapeau</label>
              <input
                value={form.nation}
                onChange={(e) => update('nation', e.target.value)}
                placeholder="🇫🇷 France"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
            </div>
          )}

          {form.type === 'player' && (
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">Position</label>
              <input
                value={form.position}
                onChange={(e) => update('position', e.target.value)}
                placeholder="ATT / MIL / DEF / GK"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
            </div>
          )}

          {/* Stats Sliders */}
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-wider mb-3">Statistiques</label>
            <div className="space-y-3">
              {STAT_KEYS.map((key) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/60 text-xs capitalize">{key}</span>
                    <span className="text-white text-xs font-mono font-bold">{stats[key]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="99"
                    value={stats[key]}
                    onChange={(e) => updateStat(key, parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                    style={{ accentColor: rarityColor }}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Sauvegarder' : 'Créer la carte'}
          </button>
        </div>

        {/* Preview */}
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Aperçu des stats</p>
          <div className="glass-elevated rounded-xl p-5 space-y-3">
            {/* Card preview header */}
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt={form.name}
                  className="w-12 h-12 rounded-lg object-cover bg-white/5"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-xl">
                  {form.type === 'nation' ? form.nation?.slice(0, 2) : '🃏'}
                </div>
              )}
              <div>
                <p className="text-white font-bold">{form.name || 'Nom de la carte'}</p>
                <p style={{ color: rarityColor }} className="text-xs font-medium">{form.rarity}</p>
              </div>
            </div>

            {/* Stat bars */}
            <div className="space-y-2">
              {STAT_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-white/40 text-xs w-20 capitalize">{key}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${stats[key]}%`,
                        backgroundColor: rarityColor,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span className="text-white/60 text-xs w-6 text-right">{stats[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
