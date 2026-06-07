'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'

interface CoinDisplayProps {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function CoinDisplay({ amount, size = 'md', animated = true }: CoinDisplayProps) {
  const count = useMotionValue(animated ? 0 : amount)
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    if (!animated) return
    const controls = animate(count, amount, { duration: 1.2, ease: 'easeOut' })
    return controls.stop
  }, [amount, animated, count])

  const sizeClass = {
    sm: 'text-sm gap-1',
    md: 'text-lg gap-1.5',
    lg: 'text-2xl gap-2',
  }[size]

  const iconSize = { sm: 14, md: 18, lg: 24 }[size]

  return (
    <span className={`inline-flex items-center font-black text-[#F5C518] ${sizeClass}`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#0A0A0F" fontWeight="900">S</text>
      </svg>
      <motion.span>{rounded}</motion.span>
    </span>
  )
}
