'use client'

import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'

interface FabProps {
  /** Acción que anuncia el lector de pantalla y el tooltip («Nueva cita»). */
  label: string
  onClick: () => void
  disabled?: boolean
  /** Texto del tooltip cuando difiere de `label` (p. ej. por qué está deshabilitado). */
  title?: string
  icon?: ReactNode
}

/**
 * Botón flotante circular de crear, abajo a la derecha (como el FAB de mobile).
 * En pantallas chicas queda sobre la barra de pestañas; el padding inferior del
 * `main` del panel evita que tape la última fila.
 */
export function Fab({ label, onClick, disabled = false, title, icon }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)] shadow-lg shadow-black/20 transition hover:scale-105 hover:bg-[var(--tenant-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tenant-primary)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 md:bottom-8 md:right-8"
    >
      {icon ?? <Plus className="h-6 w-6" aria-hidden />}
    </button>
  )
}
