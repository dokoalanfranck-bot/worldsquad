'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { NATIONS_2026 } from '@/types'
import { generateGroupCode } from '@/lib/groups'
import toast from 'react-hot-toast'

type Step = 1 | 2 | 3 | 4

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)

  // Form state
  const [nation, setNation] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [pseudoAvailable, setPseudoAvailable] = useState<boolean | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null)
  const [groupAction, setGroupAction] = useState<'create' | 'join' | 'solo'>('solo')
  const [groupName, setGroupName] = useState('')
  const [groupCode, setGroupCode] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  async function checkPseudo(value: string) {
    if (value.length < 3) { setPseudoAvailable(null); return }
    const { data } = await supabase.from('users').select('id').eq('pseudo', value).single()
    setPseudoAvailable(!data)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function generateCard(): Promise<string | null> {
    const canvas = canvasRef.current
    if (!canvas) return null

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = 300
    canvas.height = 420

    const nationData = NATIONS_2026.find((n) => n.name === nation)

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 300, 420)
    gradient.addColorStop(0, '#0f0f1a')
    gradient.addColorStop(0.5, '#1a1a2e')
    gradient.addColorStop(1, '#0f0f1a')
    ctx.fillStyle = gradient
    ctx.roundRect(0, 0, 300, 420, 16)
    ctx.fill()

    // Border
    ctx.strokeStyle = '#F5C51880'
    ctx.lineWidth = 2
    ctx.roundRect(1, 1, 298, 418, 15)
    ctx.stroke()

    // Top gold bar
    ctx.fillStyle = '#F5C518'
    ctx.roundRect(0, 0, 300, 4, [4, 4, 0, 0])
    ctx.fill()

    // Photo (circle)
    if (photoPreview) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = photoPreview
      })
      ctx.save()
      ctx.beginPath()
      ctx.arc(150, 160, 80, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, 70, 80, 160, 160)
      ctx.restore()

      // Photo border
      ctx.beginPath()
      ctx.arc(150, 160, 82, 0, Math.PI * 2)
      ctx.strokeStyle = '#F5C518'
      ctx.lineWidth = 3
      ctx.stroke()
    } else {
      // Placeholder circle
      ctx.beginPath()
      ctx.arc(150, 160, 80, 0, Math.PI * 2)
      ctx.fillStyle = '#F5C51820'
      ctx.fill()
      ctx.strokeStyle = '#F5C518'
      ctx.lineWidth = 3
      ctx.stroke()

      // Initials
      ctx.fillStyle = '#F5C518'
      ctx.font = 'bold 48px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pseudo.slice(0, 2).toUpperCase(), 150, 160)
    }

    // Nation flag (bottom right)
    if (nationData) {
      ctx.font = '36px serif'
      ctx.textAlign = 'right'
      ctx.fillText(nationData.flag, 280, 310)
    }

    // Pseudo
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 28px "Bebas Neue", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(pseudo.toUpperCase(), 150, 270)

    // Nation name
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '14px Inter, sans-serif'
    ctx.fillText(nation.toUpperCase(), 150, 306)

    // Rookie badge
    const badgeGrad = ctx.createLinearGradient(90, 360, 210, 380)
    badgeGrad.addColorStop(0, '#F5C518')
    badgeGrad.addColorStop(1, '#ffd700')
    ctx.fillStyle = badgeGrad
    ctx.roundRect(90, 360, 120, 30, 8)
    ctx.fill()
    ctx.fillStyle = '#0A0A0F'
    ctx.font = 'bold 14px "Bebas Neue", sans-serif'
    ctx.fillText('ROOKIE', 150, 370)

    return canvas.toDataURL('image/png')
  }

  async function handleGenerateCard() {
    const dataUrl = await generateCard()
    setCardImageUrl(dataUrl)
  }

  async function handleSubmit() {
    if (!nation || !email || !password || !pseudo) {
      toast.error('Remplis tous les champs')
      return
    }

    setLoading(true)

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Erreur création compte')

      const userId = authData.user.id

      // 2. Upload photo if provided
      let photoUrl: string | null = null
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photoFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }

      // 3. Upload card image
      let cardUrl: string | null = null
      if (cardImageUrl) {
        const blob = await (await fetch(cardImageUrl)).blob()
        const { error: cardUploadError } = await supabase.storage
          .from('cards')
          .upload(`${userId}/supporter-card.png`, blob, {
            contentType: 'image/png',
            upsert: true,
          })
        if (!cardUploadError) {
          const { data: urlData } = supabase.storage
            .from('cards')
            .getPublicUrl(`${userId}/supporter-card.png`)
          cardUrl = urlData.publicUrl
        }
      }

      // 4. Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: userId,
        email,
        pseudo,
        photo_url: photoUrl,
        card_image_url: cardUrl,
        nation,
        coins: 500,
        level: 'Rookie',
        card_rarity: 'Common',
      })
      if (profileError) throw profileError

      // 5. Credit signup coins
      await supabase.from('coin_transactions').insert({
        user_id: userId,
        amount: 500,
        reason: 'Bonus inscription',
      })

      // 6. Handle group
      if (groupAction === 'create' && groupName) {
        const code = generateGroupCode()
        const { data: groupData } = await supabase
          .from('groups')
          .insert({ name: groupName, code, creator_id: userId })
          .select()
          .single()
        if (groupData) {
          await supabase
            .from('group_members')
            .insert({ group_id: groupData.id, user_id: userId })
        }
      } else if (groupAction === 'join' && groupCode) {
        const { data: groupData } = await supabase
          .from('groups')
          .select()
          .eq('code', groupCode.toUpperCase())
          .single()
        if (groupData) {
          await supabase
            .from('group_members')
            .insert({ group_id: groupData.id, user_id: userId })
        } else {
          toast.error('Code groupe invalide')
        }
      }

      toast.success('🎉 Compte créé ! 500 coins offerts')
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const selectedNation = NATIONS_2026.find((n) => n.name === nation)

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4 py-8">
      {/* Hidden canvas for card generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #F5C518 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <span
            className="text-3xl font-black text-white"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            WORLD<span className="text-[#F5C518]">SQUAD</span>
          </span>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <div
                key={s}
                className={`transition-all duration-300 rounded-full ${
                  s === step
                    ? 'w-8 h-2 bg-[#F5C518]'
                    : s < step
                    ? 'w-2 h-2 bg-[#F5C518]/50'
                    : 'w-2 h-2 bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-2">Étape {step} / 4</p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: NATION ─────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="glass-elevated rounded-2xl p-6"
            >
              <h2
                className="text-3xl font-black text-white mb-2"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                CHOISIS TA NATION
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Soutiens ton équipe tout au long de la Coupe du Monde
              </p>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1">
                {NATIONS_2026.map((n) => (
                  <motion.button
                    key={n.name}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setNation(n.name)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center ${
                      nation === n.name
                        ? 'border-[#F5C518] bg-[#F5C518]/10'
                        : 'border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{n.flag}</span>
                    <span className="text-xs text-gray-400 leading-tight line-clamp-2">
                      {n.name}
                    </span>
                  </motion.button>
                ))}
              </div>

              {nation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center gap-2 text-[#F5C518] font-semibold"
                >
                  <span>{selectedNation?.flag}</span>
                  <span>{nation} sélectionné</span>
                </motion.div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!nation}
                className="w-full mt-6 bg-[#F5C518] disabled:opacity-30 disabled:cursor-not-allowed text-black font-black py-3.5 rounded-xl transition-all hover:bg-[#ffd700] hover:scale-[1.02]"
                style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem' }}
              >
                SUIVANT →
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: ACCOUNT ────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="glass-elevated rounded-2xl p-6"
            >
              <h2
                className="text-3xl font-black text-white mb-2"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                TON IDENTITÉ
              </h2>
              <p className="text-gray-500 text-sm mb-6">Email, pseudo et photo de profil</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Pseudo
                    {pseudoAvailable === true && (
                      <span className="text-green-400 ml-2 text-xs">✓ Disponible</span>
                    )}
                    {pseudoAvailable === false && (
                      <span className="text-red-400 ml-2 text-xs">✗ Déjà pris</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={pseudo}
                    onChange={(e) => {
                      setPseudo(e.target.value)
                      checkPseudo(e.target.value)
                    }}
                    placeholder="TonPseudo"
                    maxLength={20}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-all ${
                      pseudoAvailable === false
                        ? 'border-red-500/50'
                        : pseudoAvailable === true
                        ? 'border-green-500/50'
                        : 'border-white/10 focus:border-[#F5C518]/50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Photo de profil (optionnel)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-4 p-4 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[#F5C518]/40 transition-colors"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="preview"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl">
                        📷
                      </div>
                    )}
                    <span className="text-gray-500 text-sm">
                      {photoFile ? photoFile.name : 'Clique pour uploader'}
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-colors font-semibold"
                >
                  ← Retour
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!email || !password || !pseudo || pseudoAvailable === false}
                  className="flex-1 bg-[#F5C518] disabled:opacity-30 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl transition-all hover:bg-[#ffd700]"
                  style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem' }}
                >
                  SUIVANT →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: CARD GENERATION ────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="glass-elevated rounded-2xl p-6"
            >
              <h2
                className="text-3xl font-black text-white mb-2"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                TA CARTE SUPPORTER
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Génère ta carte unique — elle représente ton identité sur WorldSquad
              </p>

              <div className="flex flex-col items-center gap-6">
                {/* Card preview */}
                <div className="relative">
                  {cardImageUrl ? (
                    <div className="relative">
                      <img
                        src={cardImageUrl}
                        alt="Ta carte"
                        className="w-48 rounded-xl shadow-2xl"
                        style={{ boxShadow: '0 0 40px rgba(245,197,24,0.3)' }}
                      />
                      <div className="absolute inset-0 holo-effect rounded-xl opacity-20 pointer-events-none" />
                    </div>
                  ) : (
                    <div
                      className="w-48 h-64 rounded-xl flex items-center justify-center border border-dashed border-white/20"
                      style={{ background: 'rgba(13,13,23,0.8)' }}
                    >
                      <div className="text-center text-gray-600">
                        <div className="text-4xl mb-2">🃏</div>
                        <div className="text-xs">Pas encore générée</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleGenerateCard}
                    className="flex-1 bg-[#F5C518] text-black font-black py-3 px-6 rounded-xl transition-all hover:bg-[#ffd700] hover:scale-[1.02]"
                    style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                  >
                    {cardImageUrl ? '🔄 RÉGÉNÉRER' : '✨ GÉNÉRER MA CARTE'}
                  </button>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{selectedNation?.flag}</span>
                  <span>{nation}</span>
                  <span>·</span>
                  <span className="text-[#F5C518]">ROOKIE</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-colors font-semibold"
                >
                  ← Retour
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-[#F5C518] text-black font-black py-3 rounded-xl transition-all hover:bg-[#ffd700]"
                  style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem' }}
                >
                  SUIVANT →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: GROUP ──────────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="glass-elevated rounded-2xl p-6"
            >
              <h2
                className="text-3xl font-black text-white mb-2"
                style={{ fontFamily: 'Bebas Neue, sans-serif' }}
              >
                REJOINS TES POTES
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Crée ou rejoins un groupe privé pour jouer ensemble
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { key: 'create', icon: '➕', label: 'Créer un groupe' },
                  { key: 'join', icon: '🤝', label: 'Rejoindre' },
                  { key: 'solo', icon: '🎯', label: 'Solo pour l\'instant' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGroupAction(opt.key as typeof groupAction)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      groupAction === opt.key
                        ? 'border-[#F5C518] bg-[#F5C518]/10'
                        : 'border-white/10 bg-white/3 hover:bg-white/8'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className="text-xs text-gray-400 font-medium">{opt.label}</div>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {groupAction === 'create' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Nom de ton groupe (ex: Les Potes du Bureau)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/50 transition-all mb-4"
                    />
                  </motion.div>
                )}
                {groupAction === 'join' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <input
                      type="text"
                      value={groupCode}
                      onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                      placeholder="Code à 6 lettres (ex: XKZR8P)"
                      maxLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/50 transition-all mb-4 uppercase font-mono tracking-widest text-center text-lg"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Signup reward preview */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F5C518]/5 border border-[#F5C518]/20 mb-6">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="text-white font-bold text-sm">Récompense d&apos;inscription</p>
                  <p className="text-gray-500 text-xs">500 SquadCoins + 1 Pack Commun offert</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-colors font-semibold"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-[#F5C518] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl transition-all hover:bg-[#ffd700] hover:scale-[1.02]"
                  style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem' }}
                >
                  {loading ? 'CRÉATION...' : '🚀 CRÉER MON COMPTE'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
