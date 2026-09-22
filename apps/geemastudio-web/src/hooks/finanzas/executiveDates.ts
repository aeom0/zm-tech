import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

/** Formato de montos del resumen ejecutivo (ISO 4217 del tenant). */
export function fmtMoney(n: number, currencyCode = 'PEN') {
  return formatDashboardCurrency(n, currencyCode)
}

/** Alias histórico del port ZM (`fmtS`). */
export const fmtS = fmtMoney

/** Eje de gráficos: compacto (12k) sin decimales de moneda. */
export function fmtCompactMoney(n: number, currencyCode = 'PEN') {
  const abs = Math.abs(n)
  const symbol =
    currencyCode === 'PEN' ? 'S/' : currencyCode === 'USD' ? '$' : `${currencyCode} `
  if (abs >= 1000) {
    return `${symbol}${(n / 1000).toLocaleString('es-419', {
      maximumFractionDigits: abs >= 10_000 ? 0 : 1,
    })}k`
  }
  return `${symbol}${n.toLocaleString('es-419', { maximumFractionDigits: 0 })}`
}

/** Alias histórico. */
export const fmtCompactSoles = fmtCompactMoney

const LIMA_TZ = 'America/Lima'
const MONTH_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const

/** Partes de calendario en zona Lima (default PE; otros TZ → Fase T). */
export function getLimaDateParts(d: Date = new Date()): {
  y: number
  m: number
  day: number
} {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
  return {
    y: parseInt(get('year'), 10),
    m: parseInt(get('month'), 10) - 1,
    day: parseInt(get('day'), 10),
  }
}

/** Primer día del mes Lima como `YYYY-MM-01`. */
export function limaMonthStart(d: Date = new Date()): string {
  const { y, m } = getLimaDateParts(d)
  return `${y}-${String(m + 1).padStart(2, '0')}-01`
}

export function shiftMonth(iso: string, delta: number): string {
  const [y, m] = iso.slice(0, 10).split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`
}

/** `2026-08-01` → `Ago 26` */
export function monthTick(iso: string): string {
  const [y, m] = iso.slice(0, 10).split('-')
  const idx = Number(m) - 1
  return `${MONTH_SHORT[idx] ?? m} ${y.slice(2)}`
}
