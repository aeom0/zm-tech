import type { ReactNode } from 'react'

/** Encabezado estándar de pantalla: migas, título, descripción y acciones. */
export function PageHeader({
  eyebrow = 'Panel',
  title,
  description,
  actions,
  className = '',
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="text-xs text-fg-subtle">{eyebrow}</div>
        <h1 className="text-xl font-bold text-fg sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
