'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Send, Users, User, ChevronDown, ChevronUp,
  Check, Clock, Megaphone, ToggleLeft, ToggleRight,
  Smartphone, Globe, Swords, Trophy, Gift, Flame,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserRow { id: string; pseudo: string; nation: string; email: string }
interface LogRow {
  id: string; title: string; body: string; url: string;
  tag: string; audience: string; recipients_count: number; created_at: string
}
interface Props {
  subscriberCount: number
  users: UserRow[]
  logs: LogRow[]
}

const QUICK_TEMPLATES = [
  { icon: '⚽', label: 'Match bientôt', title: '⚽ Match dans 1 heure !', body: 'Un match commence bientôt. Vérifie ton pronostic !', url: '/matches', tag: 'match' },
  { icon: '🎯', label: 'Pronostic', title: '🎯 Résultats disponibles', body: 'Les résultats de tes pronostics viennent d\'être calculés. Vérifie tes gains !', url: '/matches', tag: 'prediction' },
  { icon: '🃏', label: 'Nouveau pack', title: '🃏 Nouveau drop de cartes !', body: 'De nouvelles cartes rares sont disponibles dans la boutique.', url: '/packs', tag: 'pack' },
  { icon: '🔥', label: 'Défi battle', title: '🔥 Quelqu\'un te défie !', body: 'Un joueur t\'a lancé un défi en battle. Réponds maintenant !', url: '/battles', tag: 'battle' },
  { icon: '🏆', label: 'Classement', title: '🏆 Classement mis à jour', body: 'Le classement a été mis à jour. Vois ta position !', url: '/leaderboard', tag: 'leaderboard' },
  { icon: '🎁', label: 'Récompense', title: '🎁 Récompense spéciale !', body: 'Une récompense exclusive t\'attend. Connecte-toi maintenant !', url: '/dashboard', tag: 'reward' },
]

const URL_SHORTCUTS = [
  { icon: Globe, label: 'Dashboard', value: '/dashboard' },
  { icon: Smartphone, label: 'Matchs', value: '/matches' },
  { icon: Gift, label: 'Packs', value: '/packs' },
  { icon: Swords, label: 'Battles', value: '/battles' },
  { icon: Trophy, label: 'Classement', value: '/leaderboard' },
  { icon: Flame, label: 'Boutique', value: '/shop' },
]

export function NotificationsClient({ subscriberCount, users, logs }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/dashboard')
  const [tag, setTag] = useState('admin')
  const [audience, setAudience] = useState<'all' | 'specific'>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [showUserPicker, setShowUserPicker] = useState(false)
  const [showLogs, setShowLogs] = useState(true)

  const charsLeft = 100 - body.length

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setTitle(t.title)
    setBody(t.body)
    setUrl(t.url)
    setTag(t.tag)
  }

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    )
  }

  const filteredUsers = users.filter(
    (u) =>
      u.pseudo.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Titre et message requis'); return }
    if (audience === 'specific' && selectedUsers.length === 0) {
      toast.error('Sélectionne au moins un utilisateur')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url, tag, audience, user_ids: selectedUsers }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`✅ Notification envoyée à ${data.sent} appareil${data.sent > 1 ? 's' : ''} !`, { duration: 5000 })
      // Reset
      setTitle('')
      setBody('')
      setUrl('/dashboard')
      setSelectedUsers([])
    } finally {
      setSending(false)
    }
  }

  const recipientLabel = audience === 'all'
    ? `Tous les abonnés (${subscriberCount} appareil${subscriberCount > 1 ? 's' : ''})`
    : selectedUsers.length === 0
    ? 'Aucun utilisateur sélectionné'
    : `${selectedUsers.length} utilisateur${selectedUsers.length > 1 ? 's' : ''} ciblé${selectedUsers.length > 1 ? 's' : ''}`

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Notifications Push</h1>
          <p className="text-white/40 text-sm">{subscriberCount} appareil{subscriberCount > 1 ? 's' : ''} abonné{subscriberCount > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Templates rapides */}
      <div className="mb-6">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Templates rapides</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => applyTemplate(t)}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 active:scale-95 transition-all text-center"
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-[10px] text-white/50 font-semibold leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {/* Titre */}
        <div>
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="Ex : ⚽ Match dans 1 heure !"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-white/20"
          />
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Message</label>
            <span className={`text-xs font-bold ${charsLeft < 20 ? 'text-orange-400' : 'text-white/30'}`}>{charsLeft} car. restants</span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 100))}
            rows={3}
            placeholder="Ex : Le match France vs Maroc commence bientôt. Vérifie ton pronostic !"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-white/20 resize-none"
          />
        </div>

        {/* URL de destination */}
        <div>
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Page de destination</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {URL_SHORTCUTS.map(({ icon: Icon, label, value }) => (
              <button
                key={value}
                onClick={() => setUrl(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  url === value
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/dashboard"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-white/20"
          />
        </div>

        {/* Audience */}
        <div>
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Audience</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setAudience('all')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border ${
                audience === 'all'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
              }`}
            >
              {audience === 'all' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              <Users size={14} />
              Tous les abonnés
            </button>
            <button
              onClick={() => { setAudience('specific'); setShowUserPicker(true) }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border ${
                audience === 'specific'
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                  : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
              }`}
            >
              {audience === 'specific' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              <User size={14} />
              Cibler
            </button>
          </div>

          {/* User picker (specific mode) */}
          <AnimatePresence>
            {audience === 'specific' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-white/10 overflow-hidden bg-white/3">
                  <div className="p-3 border-b border-white/5">
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Rechercher un utilisateur…"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none placeholder-white/20"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredUsers.map((u) => {
                      const selected = selectedUsers.includes(u.id)
                      return (
                        <button
                          key={u.id}
                          onClick={() => toggleUser(u.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-white/5 last:border-0 ${
                            selected ? 'bg-purple-500/10' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-all ${
                            selected ? 'bg-purple-500 border-purple-500' : 'border-white/20'
                          }`}>
                            {selected && <Check size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${selected ? 'text-purple-300' : 'text-white'}`}>{u.pseudo}</p>
                            <p className="text-xs text-white/30 truncate">{u.email}</p>
                          </div>
                          <span className="text-sm">{u.nation}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview + Send */}
        <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Megaphone size={14} className="text-white/40" />
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Aperçu</span>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#F5C518] flex items-center justify-center text-sm flex-shrink-0">⚽</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">{title || 'Titre de la notification…'}</p>
                <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{body || 'Corps du message…'}</p>
                <p className="text-white/30 text-[10px] mt-1">worldsquad.vercel.app</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Users size={14} />
                <span>{recipientLabel}</span>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm bg-blue-500 text-white hover:bg-blue-400 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
            >
              {sending ? (
                <span className="animate-pulse">Envoi en cours…</span>
              ) : (
                <>
                  <Send size={16} />
                  Envoyer maintenant
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Historique */}
      {logs.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest mb-3 hover:text-white/60 transition-colors"
          >
            <Clock size={12} />
            Historique ({logs.length})
            {showLogs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence>
            {showLogs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-white/5 overflow-hidden">
                  {logs.map((log, i) => (
                    <div
                      key={log.id ?? i}
                      className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Bell size={14} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">{log.title}</p>
                        <p className="text-white/40 text-xs truncate">{log.body}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-white/25">
                            {new Date(log.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            {log.audience === 'all' ? 'Tous' : `${log.recipients_count} ciblés`}
                          </span>
                          <span className="text-[10px] font-bold text-blue-400">{log.recipients_count} envoyés</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
