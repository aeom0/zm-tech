import { useState } from 'react'

/**
 * Ejecuta `reset` en el render cuando cambian `deps` (y en el primer render).
 * Reemplaza `useEffect(() => setState(...), deps)` para sincronizar estado local
 * con props sin el render extra ni el parpadeo del effect (patrón "ajustar estado
 * durante el render" de React).
 */
export function useResetOnChange(deps: readonly unknown[], reset: () => void) {
  const [prev, setPrev] = useState<readonly unknown[] | null>(null)
  if (prev === null || deps.some((d, i) => !Object.is(d, prev[i]))) {
    setPrev(deps)
    reset()
  }
}
