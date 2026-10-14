import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

import type { AvailabilityState } from '@/hooks/agenda/useAvailabilityCheck'

/** Línea de estado bajo fecha/hora: libre, ocupado hasta, o verificando. */
export function AvailabilityNote({ state }: { state: AvailabilityState }) {
  if (state.status === 'idle') return null
  if (state.status === 'checking') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Revisando disponibilidad…
      </p>
    )
  }
  if (state.status === 'free') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Horario libre
      </p>
    )
  }
  if (state.status === 'busy') {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Hay otra cita en ese horario. Queda libre a las {state.busyUntilLabel}.
      </p>
    )
  }
  return <p className="text-xs text-fg-subtle">No se pudo revisar la disponibilidad.</p>
}
