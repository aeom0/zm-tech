function tenantDateParts(timezone: string, d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const day = Number(parts.find((p) => p.type === 'day')?.value)
  return { year, month, day }
}

/** Fecha calendario del tenant como YYYY-MM-DD (IANA timezone). */
export function getTenantTodayString(timezone: string, d: Date = new Date()): string {
  const { year, month, day } = tenantDateParts(timezone, d)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Clave YYYY-MM del mes de facturación en la zona del tenant. */
export function getTenantBillingMonthKey(timezone: string, d: Date = new Date()): string {
  const { year, month } = tenantDateParts(timezone, d)
  return `${year}-${String(month).padStart(2, '0')}`
}

/** Primer día del mes (YYYY-MM-01) desplazado delta meses. */
export function shiftMonth(isoFirstOfMonth: string, delta: number): string {
  const [y, m] = isoFirstOfMonth.slice(0, 10).split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function addDaysToIsoDate(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Rango de hoy en zona tenant para consultas Supabase (timestamp sin Z). */
export function getTenantTodayRangeIso(timezone: string): { start: string; end: string } {
  const today = getTenantTodayString(timezone)
  const tomorrow = addDaysToIsoDate(today, 1)
  return {
    start: `${today}T00:00:00`,
    end: `${tomorrow}T00:00:00`,
  }
}

/** Fecha calendario del tenant hace N días (YYYY-MM-DD). */
export function getTenantDaysAgoIso(
  timezone: string,
  days: number,
  d: Date = new Date()
): string {
  const today = getTenantTodayString(timezone, d)
  return addDaysToIsoDate(today, -Math.max(0, Math.floor(days)))
}

/** Rangos de período para finanzas (detalle) en zona IANA del tenant. */
export function buildFinancesDateRanges(timezone: string) {
  const { start: todayStart, end: todayEnd } = getTenantTodayRangeIso(timezone)
  const weekStart = `${getTenantDaysAgoIso(timezone, 7)}T00:00:00`
  const monthStart = `${getTenantDaysAgoIso(timezone, 30)}T00:00:00`
  return {
    today: { start: todayStart, end: todayEnd },
    week: { start: weekStart, end: todayEnd },
    month: { start: monthStart, end: todayEnd },
  } as const
}
