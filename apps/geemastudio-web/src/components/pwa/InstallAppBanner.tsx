'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { usePwaInstall } from '@/hooks/pwa/usePwaInstall'
import { InstallSteps } from './InstallSteps'

const DISMISS_KEY = 'geema.installBanner.dismissedAt'
/** Tras cerrarlo, no vuelve a aparecer en este tiempo. */
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000

function wasDismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    return raw !== null && Date.now() - Number(raw) < DISMISS_MS
  } catch {
    return false
  }
}

/** Plan 19 W13: la PWA es el canal principal (sin tienda ni APK). */
export function InstallAppBanner() {
  const { canPrompt, platform, standalone, stage, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(wasDismissedRecently())
  }, [])

  // Sin evento ni iOS el navegador no ofrece instalar (o ya está instalada). Tras usar el
  // evento se sigue mostrando para dar la respuesta o la ruta manual.
  if (standalone || dismissed || (!canPrompt && platform !== 'ios' && stage === 'idle')) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // sin almacenamiento: solo se oculta en esta visita
    }
  }

  return (
    <div className="mx-auto mb-4 flex max-w-5xl items-start gap-3 rounded-2xl border border-fg/[0.08] bg-card px-4 py-3 text-sm md:mb-6">
      <Download className="mt-0.5 h-4 w-4 shrink-0 text-tenant-text" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold text-fg">Instala la app en tu teléfono</p>
        {stage === 'installing' ? (
          <p className="mt-0.5 text-fg-muted">Instalando. En unos segundos la verás en tu pantalla de inicio.</p>
        ) : (
          <>
            <p className="mt-0.5 text-fg-muted">Ábrela desde tu pantalla de inicio, sin tiendas ni descargas.</p>
            {canPrompt ? (
              <Button variant="primary" size="sm" className="mt-2" onClick={() => void install()}>
                Instalar
              </Button>
            ) : null}
            <InstallSteps platform={platform} stage={stage} className="mt-2 text-xs text-fg-subtle" />
          </>
        )}
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
