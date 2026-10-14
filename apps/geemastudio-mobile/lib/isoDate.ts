import { zonaIANASegura } from '@zmtech/tenant-config'

import { MONTHS_SHORT_ES } from '@/constants/dates'

/** Fechas de calendario 'YYYY-MM-DD' sin pasar por zona horaria. */

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d
}

/** '2026-10-24' → '24 oct 2026'. */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_SHORT_ES[(m ?? 1) - 1]} ${y}`
}

export function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Hoy en la zona del negocio, YYYY-MM-DD. */
export function todayIso(timeZone?: string | null): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaIANASegura(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
