'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaPlatform = 'ios' | 'other'
/** idle: sin intento; installing: Chrome aceptó; manual: el diálogo no salió o se canceló. */
export type PwaInstallStage = 'idle' | 'installing' | 'manual'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * Plan 19 W13: instalación de la PWA. Android/Chrome usa `beforeinstallprompt`; iOS Safari
 * no lo tiene y se explica el paso manual. El evento solo sirve una vez y Chrome a veces no
 * muestra el diálogo: en ese caso `stage` pasa a `manual` para ofrecer el menú del navegador.
 */
export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<PwaPlatform>('other')
  const [standalone, setStandalone] = useState(true)
  const [stage, setStage] = useState<PwaInstallStage>('idle')

  useEffect(() => {
    setStandalone(isStandalone())
    const ua = navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    setPlatform(ios ? 'ios' : 'other')

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setStage('installing')
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!promptEvent) {
      setStage('manual')
      return
    }
    setPromptEvent(null)
    try {
      await promptEvent.prompt()
      const { outcome } = await promptEvent.userChoice
      setStage(outcome === 'accepted' ? 'installing' : 'manual')
    } catch {
      setStage('manual')
    }
  }

  return { canPrompt: promptEvent !== null, platform, standalone, stage, install }
}
