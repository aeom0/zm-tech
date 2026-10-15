'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronRight, ImageIcon, Receipt, UserX } from 'lucide-react'
import { instanteCitaDesdeTexto } from '@zmtech/tenant-config'

import { usePanelAlerts } from '@/hooks/notificaciones/usePanelAlerts'

const MAX_REFERENCES = 5

/**
 * Campana del panel: pendientes del dueño con acceso directo a cada pantalla.
 * `placement="up"` abre el panel hacia arriba (pie del sidebar).
 */
export function NotificationBell({
  align = 'right',
  placement = 'down',
}: {
  align?: 'left' | 'right'
  placement?: 'down' | 'up'
}) {
  const alerts = usePanelAlerts()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!alerts.enabled) return null

  const close = () => setOpen(false)
  const refs = alerts.unreviewedReferences
  const formatDate = (value: string) => {
    const when = alerts.timeZone ? instanteCitaDesdeTexto(value, alerts.timeZone) : null
    if (!when || Number.isNaN(when.getTime())) return value.slice(0, 16).replace('T', ' ')
    return when.toLocaleString('es', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: alerts.timeZone ?? undefined,
    })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          alerts.total > 0 ? `Pendientes: ${alerts.total}` : 'Pendientes: no hay nada por revisar'
        }
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] text-fg-soft transition hover:bg-fg/[0.08] hover:text-fg"
      >
        <Bell className="h-4 w-4" />
        {alerts.total > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-[18px] text-white">
            {alerts.total > 99 ? '99+' : alerts.total}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pendientes"
          className={[
            'absolute z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl',
            placement === 'up' ? 'bottom-11' : 'top-11',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          <div className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
            Pendientes
          </div>

          {alerts.total === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-fg-muted">
              Todo al día. No hay nada por revisar.
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
              {alerts.pendingVerifications > 0 && (
                <AlertLink
                  href="/panel/validacion"
                  onClick={close}
                  icon={<Receipt className="h-4 w-4" />}
                  title={`${alerts.pendingVerifications} ${alerts.pendingVerifications === 1 ? 'comprobante' : 'comprobantes'} por validar`}
                  detail="Se aprueban desde WhatsApp"
                />
              )}
              {alerts.unassignedCount > 0 && (
                <AlertLink
                  href="/panel/asignar"
                  onClick={close}
                  icon={<UserX className="h-4 w-4" />}
                  title={`${alerts.unassignedCount} ${alerts.unassignedCount === 1 ? 'cita' : 'citas'} sin asignar`}
                  detail="Próximos 7 días"
                />
              )}
              {refs.slice(0, MAX_REFERENCES).map((apt) => (
                <AlertLink
                  key={apt.id}
                  href={`/panel/agenda?fecha=${apt.date.slice(0, 10)}&cita=${apt.id}`}
                  onClick={close}
                  icon={<ImageIcon className="h-4 w-4" />}
                  title={`Fotos de ${apt.client_name}`}
                  detail={`${apt.reference_image_paths?.length ?? 0} sin revisar · ${formatDate(apt.date)}`}
                />
              ))}
              {refs.length > MAX_REFERENCES && (
                <li className="px-4 py-2.5 text-xs text-fg-muted">
                  y {refs.length - MAX_REFERENCES} citas más con fotos sin revisar
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function AlertLink({
  href,
  onClick,
  icon,
  title,
  detail,
}: {
  href: string
  onClick: () => void
  icon: React.ReactNode
  title: string
  detail: string
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3 transition hover:bg-fg/[0.04]"
      >
        <span className="bg-[var(--tenant-primary)]/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-tenant-text">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{title}</span>
          <span className="block truncate text-xs text-fg-muted">{detail}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
      </Link>
    </li>
  )
}
