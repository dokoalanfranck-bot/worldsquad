'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NATIONS_2026 } from '@/types'
import toast from 'react-hot-toast'
import { Loader2, Globe } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [nation, setNation] = useState('')
  const [nationSearch, setNationSearch] = useState('')

  const supabase = createClient()

  const filteredNations = nationSearch.trim()
    ? NATIONS_2026.filter((n) =>
        n.name.toLowerCase().includes(nationSearch.toLowerCase())
      )
    : NATIONS_2026

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !pseudo || !nation) {
      toast.error('Remplis tous les champs')
      return
    }
    if (password.length < 6) {
      toast.error('Mot de passe trop court (6 caractères minimum)')
      return
    }

    setLoading(true)
    try {
      // 1. Créer le compte auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('Erreur création compte')

      // Si pas de session = confirmation email requise (désactive-la dans Supabase Auth settings)
      if (!authData.session) {
        toast.success('Vérifie tes emails pour confirmer ton compte')
        router.push('/login')
        return
      }

      // 2. Créer le profil via API server (bypass RLS)
      const res = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id, email, pseudo, nation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur création profil')

      // 3. Email de bienvenue (fire-and-forget)
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, pseudo }),
      }).catch(() => {})

      toast.success('Compte créé ! 500 coins offerts')
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Erreur inconnue'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const selectedNation = NATIONS_2026.find((n) => n.name === nation)

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #F5C518 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="w-6 h-6 text-[#F5C518]" />
            <span className="font-bebas text-3xl text-white tracking-widest">
              WORLD<span className="text-[#F5C518]">SQUAD</span>
            </span>
          </div>
          <p className="text-white/40 text-sm">Crée ton compte — 500 coins offerts</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-elevated rounded-2xl p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              autoComplete="email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#F5C518]/50 transition-all"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              autoComplete="new-password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#F5C518]/50 transition-all"
            />
          </div>

          {/* Pseudo */}
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">Pseudo</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="TonPseudo"
              maxLength={20}
              autoComplete="username"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#F5C518]/50 transition-all"
            />
          </div>

          {/* Nation */}
          <div>
            <label className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">
              Ta nation{selectedNation && <span className="ml-2 text-[#F5C518] normal-case">{selectedNation.flag} {selectedNation.name}</span>}
            </label>
            <input
              type="text"
              value={nationSearch}
              onChange={(e) => setNationSearch(e.target.value)}
              placeholder="Recherche une nation..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#F5C518]/50 transition-all text-sm mb-2"
            />
            <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
              {filteredNations.map((n) => (
                <button
                  key={n.name}
                  type="button"
                  onClick={() => { setNation(n.name); setNationSearch('') }}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all text-center ${
                    nation === n.name
                      ? 'border-[#F5C518] bg-[#F5C518]/10'
                      : 'border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/20'
                  }`}
                >
                  <span className="text-xl">{n.flag}</span>
                  <span className="text-[10px] text-white/50 leading-tight line-clamp-1">{n.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password || !pseudo || !nation}
            className="w-full bg-[#F5C518] disabled:opacity-30 disabled:cursor-not-allowed text-black font-bebas text-xl py-3.5 rounded-xl transition-all hover:bg-[#ffd700] flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'CRÉER MON COMPTE'
            )}
          </button>

          <p className="text-center text-white/30 text-sm">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-[#F5C518] hover:text-[#ffd700] transition-colors">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
