'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X, Film } from 'lucide-react'

interface Highlight {
  id: string
  title: string
  youtube_id: string | null
  video_url: string | null
  created_at: string
}

function VideoCard({ highlight }: { highlight: Highlight }) {
  const [playing, setPlaying] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const isYoutube = !!highlight.youtube_id

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {playing ? (
        <div className="relative aspect-video bg-black">
          {isYoutube ? (
            <iframe
              src={`https://www.youtube.com/embed/${highlight.youtube_id}?autoplay=1&rel=0`}
              title={highlight.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : videoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-900 text-gray-400 min-h-[180px]">
              <span className="text-2xl">⚠️</span>
              <p className="text-xs text-center px-4">Impossible de lire la vidéo</p>
              <a
                href={highlight.video_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-xs underline mt-1"
              >
                Ouvrir dans un nouvel onglet
              </a>
            </div>
          ) : (
            <video
              src={highlight.video_url!}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full"
              onError={() => setVideoError(true)}
            />
          )}
          <button
            onClick={() => { setPlaying(false); setVideoError(false) }}
            className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-black/90 transition-colors z-10"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full aspect-video group overflow-hidden"
        >
          {isYoutube ? (
            <img
              src={`https://img.youtube.com/vi/${highlight.youtube_id}/maxresdefault.jpg`}
              alt={highlight.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const img = e.currentTarget
                if (!img.src.includes('mqdefault')) {
                  img.src = `https://img.youtube.com/vi/${highlight.youtube_id}/mqdefault.jpg`
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 group-hover:from-gray-700 group-hover:to-gray-800 transition-all duration-300" />
          )}

          {/* Overlay play */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl ${
                isYoutube ? 'bg-red-600' : 'bg-blue-600'
              }`}
              style={{ boxShadow: isYoutube ? '0 0 30px rgba(220,38,38,0.5)' : '0 0 30px rgba(37,99,235,0.5)' }}
            >
              <Play size={24} fill="white" className="text-white ml-1" />
            </motion.div>
          </div>
        </button>
      )}

      <div className="px-4 py-3">
        <p className="text-white font-bold text-sm leading-snug">{highlight.title}</p>
        <p className="text-gray-500 text-xs mt-1">
          {new Date(highlight.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
        </p>
      </div>
    </motion.div>
  )
}

export function HighlightsClient({ highlights }: { highlights: Highlight[] }) {
  return (
    <div className="dashboard-content min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-red-600/15 flex items-center justify-center">
          <Film size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            RÉSUMÉS
          </h1>
          <p className="text-gray-500 text-xs">Revivez les meilleurs moments</p>
        </div>
      </div>

      {highlights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center">
            <Film size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">Aucun résumé disponible pour l&apos;instant</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {highlights.map((h) => (
              <VideoCard key={h.id} highlight={h} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
