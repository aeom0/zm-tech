'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const isSecure =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'

    if (isSecure) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug('ServiceWorker no se pudo registrar:', err)
        }
      })
    }
  }, [])

  return null
}
