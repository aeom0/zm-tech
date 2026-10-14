'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronRight } from 'lucide-react'
import {
  dateKeyEnZona,
  formatHolidayAlertTitle,
  getUpcomingHolidayAlerts,
  zonaIANASegura,
} from '@zmtech/tenant-config'

import { useAuth } from '@/contexts/AuthContext'
import { useSalonHolidays } from '@/hooks/feriados/useSalonHolidays'

/** Aviso de feriados o días especiales en los próximos `withinDays` días. */
export function HolidayAlertBanner({
  timeZone,
  withinDays = 3,
}: {
  timeZone: string
  withinDays?: number
}) {
  const { isAdmin } = useAuth()
  const { holidayIndex } = useSalonHolidays()

  const alerts = useMemo(() => {
    const today = dateKeyEnZona(new Date(), zonaIANASegura(timeZone))
    return getUpcomingHolidayAlerts(today, holidayIndex, withinDays)
  }, [holidayIndex, withinDays, timeZone])

  if (alerts.length === 0) return null

  const primary = alerts[0]
  const extra =
    alerts.length > 1 ? ` (+${alerts.length - 1} día${alerts.length > 2 ? 's' : ''} más)` : ''

  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tenant-primary)]/10">
        <CalendarDays className="h-4 w-4 text-[var(--tenant-primary)]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fg">
          {formatHolidayAlertTitle(primary)}
          {extra}
        </span>
        <span className="block text-xs text-fg-muted">
          {primary.scheduleHint}. Revisa la agenda antes de agendar citas.
        </span>
      </span>
      {isAdmin && <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />}
    </>
  )

  const className =
    'flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 transition'

  return isAdmin ? (
    <Link href="/panel/feriados" className={`${className} hover:bg-fg/[0.03]`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}
