'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'

const DISMISS_KEY = 'geema.installBanner.dismissedAt'
/** Tras cerrarlo, no vuelve a aparecer en este tiempo. */
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function wasDismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    return raw !== null && Date.now() - Number(raw) < DISMISS_MS
  } catch {
    return false
  }
}

/**
 * Plan 19 W13: la PWA es el canal principal (sin tienda ni APK). Android/Chrome
 * usa `beforeinstallprompt`; iOS Safari no lo tiene, así que se explica el paso manual.
 */
export function InstallAppBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIos, setShowIos] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return
    setHidden(false)

    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    if (isIos) setShowIos(true)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden || (!promptEvent && !showIos)) return null

  const dismiss = () => {
    setHidden(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // sin almacenamiento: solo se oculta en esta visita
    }
  }

  const install = async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    setPromptEvent(null)
    if (outcome === 'accepted') setHidden(true)
  }

  return (
    <div className="mx-auto mb-4 flex max-w-5xl items-start gap-3 rounded-2xl border border-fg/[0.08] bg-card px-4 py-3 text-sm md:mb-6">
      <Download className="mt-0.5 h-4 w-4 shrink-0 text-tenant-text" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold text-fg">Instala la app en tu teléfono</p>
        {promptEvent ? (
          <p className="mt-0.5 text-fg-muted">Ábrela desde tu pantalla de inicio, sin tiendas ni descargas.</p>
        ) : (
          <p className="mt-0.5 text-fg-muted">
            En Safari toca <Share className="inline h-3.5 w-3.5 align-[-2px]" aria-label="Compartir" /> y
            luego «Agregar a inicio».
          </p>
        )}
        {promptEvent ? (
          <Button variant="primary" size="sm" className="mt-2" onClick={() => void install()}>
            Instalar
          </Button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="text-fg-subtle hover:text-fg"
        aria-label="Cerrar aviso de instalación"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
