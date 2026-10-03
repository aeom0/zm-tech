'use client'

type SavingState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  state: SavingState
}

const messages: Record<SavingState, { text: string; className: string } | null> = {
  idle: null,
  saving: { text: 'Guardando...', className: 'text-amber-700/90 dark:text-amber-400/90' },
  saved: { text: 'Listo', className: 'text-emerald-700 dark:text-emerald-400' },
  error: { text: 'Error al guardar', className: 'text-red-700 dark:text-red-400' },
}

export function SavingIndicator({ state }: Props) {
  const msg = messages[state]
  if (!msg) return null
  return (
    <span className={`text-xs font-medium transition-opacity ${msg.className}`}>{msg.text}</span>
  )
}
