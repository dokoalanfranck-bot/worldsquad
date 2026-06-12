'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Copy, X, Check, Twitter, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  url: string
  title: string
  text?: string
  imageUrl?: string
  label?: string
  className?: string
  variant?: 'default' | 'gold' | 'outline'
}

export function ShareSheet({ url, title, text, imageUrl, label = 'Partager', className = '', variant = 'default' }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const absoluteUrl = typeof window !== 'undefined'
    ? url.startsWith('http') ? url : `${window.location.origin}${url}`
    : url

  const shareText = text ?? title
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(absoluteUrl)}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${absoluteUrl}`)}`

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) { setOpen(true); return }
    try {
      const shareData: ShareData = { title, text: shareText, url: absoluteUrl }
      if (imageUrl && navigator.canShare) {
        try {
          const res = await fetch(imageUrl)
          const blob = await res.blob()
          const file = new File([blob], 'worldsquad.png', { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            shareData.files = [file]
          }
        } catch {
          // fall back to URL-only share
        }
      }
      await navigator.share(shareData)
    } catch {
      setOpen(true)
    }
  }, [title, shareText, absoluteUrl, imageUrl])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl)
      setCopied(true)
      toast.success('Lien copié !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  const downloadImage = async () => {
    if (!imageUrl) return
    setDownloading(true)
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'worldsquad.png'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      toast.error('Erreur téléchargement')
    } finally {
      setDownloading(false)
    }
  }

  const btnClass = variant === 'gold'
    ? 'bg-[#F5C518] text-black font-black'
    : variant === 'outline'
    ? 'border border-[#F5C518]/40 text-[#F5C518] bg-[#F5C518]/8 hover:bg-[#F5C518]/15'
    : 'bg-white/8 border border-white/10 text-white hover:bg-white/12'

  return (
    <>
      <button
        onClick={handleNativeShare}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${btnClass} ${className}`}
      >
        <Share2 size={14} />
        {label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-white/8 bg-[#0f0f1c] overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Share2 size={16} className="text-[#F5C518]" />
                    <h3 className="text-white font-black text-base">Partager</h3>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-white/30 hover:text-white/60"
                  >
                    <X size={13} />
                  </button>
                </div>

                <p className="text-white/60 text-sm mb-5 leading-relaxed">{title}</p>

                <div className="space-y-2.5">
                  {/* Copy link */}
                  <button
                    onClick={copyLink}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition-colors"
                  >
                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-white/50" />}
                    <span className="text-sm font-semibold text-white">
                      {copied ? 'Lien copié !' : 'Copier le lien'}
                    </span>
                  </button>

                  {/* Twitter / X */}
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-black/40 border border-white/8 hover:bg-black/60 transition-colors"
                  >
                    <Twitter size={16} className="text-white/70" />
                    <span className="text-sm font-semibold text-white">Partager sur X / Twitter</span>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/15 transition-colors"
                  >
                    <MessageCircle size={16} className="text-[#25D366]" />
                    <span className="text-sm font-semibold text-white">Partager sur WhatsApp</span>
                  </a>

                  {/* Download image if available */}
                  {imageUrl && (
                    <button
                      onClick={downloadImage}
                      disabled={downloading}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/20 hover:bg-[#F5C518]/15 transition-colors disabled:opacity-50"
                    >
                      <span className="text-lg">{downloading ? '⏳' : '⬇️'}</span>
                      <span className="text-sm font-semibold text-[#F5C518]">
                        {downloading ? 'Téléchargement…' : 'Télécharger l\'image'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
