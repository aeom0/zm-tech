import { EllipsisVertical, Share } from 'lucide-react'

import type { PwaInstallStage, PwaPlatform } from '@/hooks/pwa/usePwaInstall'

const ICON = 'inline h-3.5 w-3.5 align-[-2px]'

/** Ruta manual de instalación según el navegador (Safari en iOS, menú de Chrome en Android). */
export function InstallSteps({
  platform,
  stage,
  className,
}: {
  platform: PwaPlatform
  stage: PwaInstallStage
  className?: string
}) {
  if (platform === 'ios') {
    return (
      <p className={className}>
        En Safari toca <Share className={ICON} aria-label="Compartir" /> y luego «Agregar a inicio».
      </p>
    )
  }
  return (
    <p className={className}>
      {stage === 'manual' ? 'No se abrió la instalación. ' : '¿No funciona el botón? '}
      Abre el menú <EllipsisVertical className={ICON} aria-label="de Chrome" /> de Chrome y toca
      «Instalar app» o «Agregar a pantalla principal».
    </p>
  )
}
