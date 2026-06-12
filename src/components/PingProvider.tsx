'use client'

import { useEffect } from 'react'

export function PingProvider() {
  useEffect(() => {
    const ping = () => fetch('/api/ping', { method: 'POST' }).catch(() => {})
    ping()
    const t = setInterval(ping, 60000)
    return () => clearInterval(t)
  }, [])

  return null
}
