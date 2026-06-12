'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  name: string
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legend'
  nation?: string
  pseudo: string
  className?: string
}

const IG_GRADIENT = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'

export function InstagramStoryShare({ name, rarity, nation = '', pseudo, className = '' }: Props) {
  const [loading, setLoading] = useState(false)
  const [showDesktopModal, setShowDesktopModal] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const storyUrl = `/api/og?type=story&name=${encodeURIComponent(name)}&rarity=${rarity}&nation=${encodeURIComponent(nation)}&pseudo=${encodeURIComponent(pseudo)}`

  async function fetchStoryBlob(): Promise<File> {
    const res = await fetch(storyUrl)
    if (!res.ok) throw new Error('Génération échouée')
    const blob = await res.blob()
    return new File([blob], 'worldsquad-story.png', { type: 'image/png' })
  }

  async function handleClick() {
    setLoading(true)
    try {
      const file = await fetchStoryBlob()

      // Mobile with native file share → opens Instagram / system sheet directly
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `J'ai obtenu ${name} ${rarity === 'Legend' ? '🏆' : '⚡'} sur WorldSquad !`,
            text: `Rejoins-moi sur WorldSquad ⚽ worldsquad.vercel.app`,
          })
          return
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return // user cancelled
        }
      }

      // Fallback: show modal with preview + download button
      const url = URL.createObjectURL(file)
      setBlobUrl(url)
      setShowDesktopModal(true)
    } catch {
      toast.error('Erreur lors de la génération de l\'image')
    } finally {
      setLoading(false)
    }
  }

  function downloadImage() {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `worldsquad-story-${name.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
    toast.success('Image téléchargée ! Partage-la dans ta Story Instagram 📸', { duration: 5000 })
  }

  function closeModal() {
    setShowDesktopModal(false)
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null) }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 active:scale-95 ${className}`}
        style={{ background: IG_GRADIENT }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Génération…
          </>
        ) : (
          <>
            <span className="text-base">📸</span>
            Story Instagram
          </>
        )}
      </button>

      <AnimatePresence>
        {showDesktopModal && blobUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f0f1c] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📸</span>
                  <h3 className="text-white font-black text-base">Story Instagram</h3>
                </div>
                <button
                  onClick={closeModal}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-white/30 hover:text-white/60"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Preview */}
              <div className="p-4">
                <div className="relative rounded-2xl overflow-hidden mx-auto" style={{ maxWidth: '200px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={blobUrl} alt="Story preview" className="w-full rounded-2xl" />
                  <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />
                </div>
              </div>

              {/* Instructions */}
              <div className="px-5 pb-2 space-y-2.5">
                <div className="rounded-xl bg-white/4 border border-white/8 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Smartphone size={14} className="text-[#F5C518] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-white/60 leading-relaxed">
                      Sur mobile, utilise l&apos;app Instagram pour importer cette image dans tes Stories.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-white/35 px-1">
                  {[
                    '① Télécharge l\'image ci-dessous',
                    '② Ouvre Instagram → Appareil photo Story',
                    '③ Sélectionne l\'image depuis ta galerie',
                  ].map((step) => (
                    <p key={step}>{step}</p>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 pt-3 space-y-2">
                <button
                  onClick={downloadImage}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
                  style={{ background: IG_GRADIENT }}
                >
                  <Download size={15} />
                  Télécharger l&apos;image Story
                </button>
                <button
                  onClick={closeModal}
                  className="w-full py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
