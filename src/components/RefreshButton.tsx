'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'

export function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function refresh() {
    if (spinning) return
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <motion.button
      onClick={refresh}
      whileTap={{ scale: 0.88 }}
      aria-label="Actualiser"
      className="fixed z-50 right-4 bottom-[5.5rem] lg:bottom-6 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-white/10"
      style={{
        background: 'rgba(13,31,53,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <motion.div
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <RotateCcw size={16} className="text-gray-400" />
      </motion.div>
    </motion.button>
  )
}
