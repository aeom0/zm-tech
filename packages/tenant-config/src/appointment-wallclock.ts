import { DateTime } from 'luxon'

import { zonaIANASegura } from './iana-timezone'

/**
 * `appointments.date` es timestamp WITHOUT time zone: hora de pared del salón.
 * PostgREST a veces añade `Z` o `+00` — hay que ignorarlo y leer YYYY-MM-DD HH:MM literal
 * en la IANA del tenant (ZM: America/Lima). Si se interpreta como UTC, las citas
 * se desplazan (Lima −5 h) y “desaparecen” del día/hora de la agenda.
 */
const WALLCLOCK = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/

export function stripTzSuffixCita(raw: string): string {
  return String(raw)
    .trim()
    .replace('T', ' ')
    .replace(/\.\d+/, '')
    .replace(/Z$/i, '')
    .replace(/[+-]\d{2}:?\d{2}$/, '')
}

export function parseAppointmentWallclock(
  dateStr: string | null | undefined,
  timeZone: string
): Date | null {
  if (!dateStr) {
    return null
  }
  const match = WALLCLOCK.exec(stripTzSuffixCita(dateStr))
  if (!match) {
    return null
  }
  const z = zonaIANASegura(timeZone)
  const dt = DateTime.fromObject(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: Number(match[6] ?? 0),
      millisecond: 0,
    },
    { zone: z }
  )
  return dt.isValid ? dt.toJSDate() : null
}

/** Fallback seguro para UI: si el parseo falla, Date inválido (no inventar UTC). */
export function instanteCitaDesdeTexto(dateStr: string, timeZone: string): Date {
  return parseAppointmentWallclock(dateStr, timeZone) ?? new Date(Number.NaN)
}

/** Serializa para insert/update en `appointments.date` (espacio, sin T ni Z). */
export function formatAppointmentWallclock(instant: Date, timeZone: string): string {
  const z = zonaIANASegura(timeZone)
  return DateTime.fromJSDate(instant, { zone: z }).toFormat('yyyy-MM-dd HH:mm:ss')
}

export function formatoHoraHHMMEnZona(instant: Date, timeZone: string): string {
  const z = zonaIANASegura(timeZone)
  return DateTime.fromJSDate(instant, { zone: z }).toFormat('HH:mm')
}
