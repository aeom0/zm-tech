import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

type StateKind = 'loading' | 'empty' | 'error' | 'warning'

const TONE: Record<StateKind, string> = {
  loading: 'border-fg/[0.08] bg-card text-fg-subtle',
  empty: 'border-fg/[0.08] bg-card text-fg-subtle',
  error: 'border-red-500/25 bg-red-500/10 text-red-800 dark:text-red-200',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-100',
}

/** Bloque unificado para estados de cargando, vacío, error y aviso. */
export function StateNote({
  kind = 'empty',
  icon,
  children,
  action,
}: {
  kind?: StateKind
  icon?: ReactNode
  children: ReactNode
  action?: ReactNode
}) {
  const centered = kind === 'loading' || kind === 'empty'
  return (
    <div
      role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined}
      className={[
        'rounded-2xl border px-4 text-sm',
        TONE[kind],
        centered ? 'flex flex-col items-center gap-2 py-8 text-center' : 'py-3',
      ].join(' ')}
    >
      {kind === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : icon}
      <div>{children}</div>
      {action}
    </div>
  )
}
