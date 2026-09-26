import { zonaIANASegura } from './iana-timezone'

export interface InstantDateFormatOptions {
  dateStyle?: 'full' | 'long' | 'medium' | 'short'
  timeStyle?: 'full' | 'long' | 'medium' | 'short'
  day?: 'numeric' | '2-digit'
  month?: 'numeric' | '2-digit' | 'short' | 'long'
  year?: 'numeric' | '2-digit'
  hour?: 'numeric' | '2-digit'
  minute?: 'numeric' | '2-digit'
  second?: 'numeric' | '2-digit'
  hour12?: boolean
}

/** Convierte un timestamp real de Supabase en un Date válido. */
export function instanteDesdeTimestamp(
  timestamp: string | null | undefined
): Date | null {
  if (!timestamp) return null
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Formatea un instante real (timestamptz) en la zona IANA del tenant.
 * No usar para `appointments.date`, que es hora de pared sin zona.
 */
export function formatoInstanteEnZona(
  timestamp: string | null | undefined,
  timeZone: string,
  language: string,
  options: InstantDateFormatOptions
): string {
  const date = instanteDesdeTimestamp(timestamp)
  if (!date) return '—'

  return new Intl.DateTimeFormat(language, {
    ...options,
    timeZone: zonaIANASegura(timeZone),
  }).format(date)
}
