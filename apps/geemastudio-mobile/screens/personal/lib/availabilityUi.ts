import { zonaIANASegura } from '@zmtech/tenant-config'

/** Hoy en la zona del negocio, YYYY-MM-DD. */
export function todayIso(timeZone?: string | null): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaIANASegura(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** '2026-10-24' → '24 oct 2026' sin pasar por zona horaria. */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d} ${months[(m ?? 1) - 1]} ${y}`
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function rangeLabel(from: string, to: string | null): string {
  if (to === null) return `Desde el ${formatIsoDate(from)}, hasta nuevo aviso`
  return from === to ? formatIsoDate(from) : `${formatIsoDate(from)} al ${formatIsoDate(to)}`
}
