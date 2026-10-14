import type { ReactNode } from 'react'

/** Clase común para input/select/textarea del panel. */
export const inputClass =
  'w-full rounded-xl border border-line bg-fg/[0.03] px-3 py-2 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-[var(--tenant-primary)] disabled:opacity-60'

interface FieldProps {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-fg-soft">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  )
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
    >
      {message}
    </div>
  )
}
