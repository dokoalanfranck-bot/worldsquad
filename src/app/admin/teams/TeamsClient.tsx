'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Upload, Globe, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface Team {
  id: string
  name: string
  flag: string | null
  group_letter: string | null
  confederation: string | null
  fifa_rank: number | null
}

interface TeamsClientProps {
  teams: Team[]
}

const PLACEHOLDER_JSON = `{
  "groups": {
    "A": [
      {"name": "Canada", "flag": "🇨🇦"},
      {"name": "USA", "flag": "🇺🇸"},
      {"name": "Mexico", "flag": "🇲🇽"},
      {"name": "Uruguay", "flag": "🇺🇾"}
    ],
    "B": [
      {"name": "Germany", "flag": "🇩🇪"},
      {"name": "France", "flag": "🇫🇷"},
      {"name": "Spain", "flag": "🇪🇸"},
      {"name": "Brazil", "flag": "🇧🇷"}
    ]
  },
  "generate_matches": false,
  "first_match_date": "2026-06-11"
}`

export function TeamsClient({ teams }: TeamsClientProps) {
  const router = useRouter()
  const [jsonInput, setJsonInput] = useState('')
  const [preview, setPreview] = useState<{ group: string; teams: { name: string; flag: string }[] }[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const handleParse = () => {
    setParseError(null)
    setPreview(null)
    try {
      const parsed = JSON.parse(jsonInput)
      if (!parsed.groups || typeof parsed.groups !== 'object') {
        throw new Error('Le champ "groups" est requis')
      }
      const previewData = Object.entries(parsed.groups as Record<string, { name: string; flag?: string }[]>).map(
        ([group, groupTeams]) => ({
          group,
          teams: groupTeams.map((t) => ({ name: t.name, flag: t.flag ?? '🏳' })),
        })
      )
      setPreview(previewData)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'JSON invalide')
    }
  }

  const handleImport = async () => {
    if (!preview) return
    setImporting(true)
    try {
      const parsed = JSON.parse(jsonInput)
      const res = await fetch('/api/admin/import-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur import')
      toast.success(
        `${data.teamsImported} équipes importées${data.matchesGenerated ? ` · ${data.matchesGenerated} matchs générés` : ''}`
      )
      setPreview(null)
      setJsonInput('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setImporting(false)
    }
  }

  // Group teams by group_letter
  const groupedTeams = teams.reduce<Record<string, Team[]>>((acc, team) => {
    const key = team.group_letter ?? 'Sans groupe'
    if (!acc[key]) acc[key] = []
    acc[key].push(team)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bebas text-4xl text-white">ÉQUIPES & GROUPES</h1>
        <p className="text-white/50 text-sm mt-1">Import JSON · {teams.length} équipes enregistrées</p>
      </div>

      {/* JSON Import Section */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-white text-sm">Import JSON</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-white/60 text-xs uppercase tracking-wider block mb-2">
              Coller le JSON des groupes
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); setParseError(null); setPreview(null) }}
              placeholder={PLACEHOLDER_JSON}
              rows={12}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-xs font-mono focus:outline-none focus:border-blue-500/50 resize-y"
            />
          </div>

          {parseError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleParse}
              disabled={!jsonInput.trim()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyser
            </button>
            {preview && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Importer
              </button>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="mt-4 space-y-3">
              <p className="text-white/60 text-xs uppercase tracking-wider">Aperçu — {preview.reduce((s, g) => s + g.teams.length, 0)} équipes</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {preview.map(({ group, teams: groupTeams }) => (
                  <div key={group} className="glass-elevated rounded-lg p-3">
                    <p className="font-bebas text-blue-400 text-lg mb-2">GROUPE {group}</p>
                    <div className="space-y-1">
                      {groupTeams.map((t) => (
                        <div key={t.name} className="flex items-center gap-2 text-sm">
                          <span>{t.flag}</span>
                          <span className="text-white/80">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Teams */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-white text-sm">Équipes actuelles ({teams.length})</h2>
        </div>
        <div className="p-6">
          {teams.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Aucune équipe importée</p>
              <p className="text-white/20 text-xs mt-1">Utilisez l&apos;import JSON ci-dessus</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Object.entries(groupedTeams)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([group, groupTeams]) => (
                  <div key={group} className="glass-elevated rounded-lg p-3">
                    <p className="font-bebas text-blue-400 text-base mb-2">
                      {group === 'Sans groupe' ? 'SANS GROUPE' : `GROUPE ${group}`}
                    </p>
                    <div className="space-y-1.5">
                      {groupTeams.map((team) => (
                        <div key={team.id} className="flex items-center gap-2 text-sm">
                          <span className="text-base">{team.flag ?? '🏳'}</span>
                          <span className="text-white/80 text-xs">{team.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
