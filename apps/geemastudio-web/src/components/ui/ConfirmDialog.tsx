'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

/**
 * Reemplazo de `window.confirm`: devuelve `confirm()` (promesa de boolean) y el
 * `dialog` que el componente debe renderizar. Bottom sheet en mobile.
 */
export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve })
      }),
    []
  )

  const close = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok)
      setPending(null)
    },
    [pending]
  )

  useEffect(() => {
    if (!pending) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, close])

  const dialog = pending ? (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-scrim/50 sm:items-center sm:p-4"
      onClick={() => close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-t-2xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-base font-semibold text-fg">
          {pending.title}
        </h2>
        {pending.description && (
          <p className="mt-1.5 text-sm text-fg-muted">{pending.description}</p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => close(false)}
            className="min-h-[44px] rounded-xl border border-line-strong px-4 text-sm font-medium text-fg-soft hover:bg-fg/[0.06]"
          >
            {pending.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={[
              'min-h-[44px] rounded-xl px-4 text-sm font-semibold',
              pending.destructive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)] hover:bg-[var(--tenant-primary-hover)]',
            ].join(' ')}
          >
            {pending.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, dialog }
}
