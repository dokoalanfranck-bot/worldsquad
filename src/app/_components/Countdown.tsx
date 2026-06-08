'use client'

import { useEffect, useState } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function compute(targetMs: number): TimeLeft {
  const diff = Math.max(0, targetMs - Date.now())
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function Countdown({ targetMs }: { targetMs: number }) {
  const [time, setTime] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setTime(compute(targetMs))
    const id = setInterval(() => setTime(compute(targetMs)), 1000)
    return () => clearInterval(id)
  }, [targetMs])

  const isOver = time ? targetMs <= Date.now() : false

  if (!time) return null

  if (isOver) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#F5C518]/10 border border-[#F5C518]/20 rounded-2xl px-6 py-3 mb-2">
        <span className="text-2xl">🏆</span>
        <span className="text-[#F5C518] font-black text-lg font-bebas tracking-wider">LE MONDIAL EST EN COURS !</span>
      </div>
    )
  }

  const UNITS = [
    { label: 'JOURS', value: time.days },
    { label: 'HEURES', value: time.hours },
    { label: 'MIN', value: time.minutes },
    { label: 'SEC', value: time.seconds },
  ]

  return (
    <div className="inline-flex flex-col items-center gap-3 mb-2">
      <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">
        Coup d&apos;envoi du Mondial
      </p>
      <div className="flex items-center gap-2 sm:gap-3">
        {UNITS.map((u, i) => (
          <div key={u.label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center">
              <div className="glass border border-white/10 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-[56px] sm:min-w-[72px] text-center">
                <span className="text-3xl sm:text-4xl font-black text-white font-bebas leading-none">
                  {pad(u.value)}
                </span>
              </div>
              <span className="text-white/30 text-[10px] mt-1.5 font-bold tracking-widest">{u.label}</span>
            </div>
            {i < UNITS.length - 1 && (
              <span className="text-[#F5C518] text-3xl font-black pb-4 opacity-60">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
