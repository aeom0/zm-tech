'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: ReactNode
  /** Ícono opcional a la izquierda del título. */
  icon?: ReactNode
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  /** Pie fijo (botones). */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Bloquea cerrar con Escape o clic afuera (p. ej. mientras guarda). */
  dismissible?: boolean
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
}

/**
 * Diálogo del panel: bottom sheet en mobile, centrado en desktop. Cierra con
 * Escape y clic en el fondo, bloquea el scroll del body y enfoca el diálogo.
 * Montar solo mientras está abierto.
 */
export function Modal({
  title,
  icon,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)

  useEffect(() => {
    onCloseRef.current = onClose
    dismissibleRef.current = dismissible
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissibleRef.current) onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60 sm:items-center sm:p-4"
      onClick={() => dismissible && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          'flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-2xl outline-none sm:max-h-[88vh] sm:rounded-2xl',
          SIZE[size],
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold text-fg">
              {icon}
              <span className="truncate">{title}</span>
            </h2>
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Cerrar"
            className="-mr-1.5 rounded-lg p-1.5 text-fg-subtle hover:bg-fg/[0.06] hover:text-fg disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
