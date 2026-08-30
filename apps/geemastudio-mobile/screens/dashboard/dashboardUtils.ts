import {
  esMismoDiaCalendarioEnZona,
  instanteCitaDesdeTexto,
  zonaIANASegura,
} from '@zmtech/tenant-config'

/** Parseo de `appointments.date` como hora de pared del tenant (ignora Z falso de PostgREST). */
export function parseAppointmentDate(dateString: string, timeZone: string): Date {
  return instanteCitaDesdeTexto(dateString, timeZone)
}

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function formatDashboardTime(
  dateString: string,
  locale: string,
  timeZone: string
): string {
  const tz = zonaIANASegura(timeZone)
  return instanteCitaDesdeTexto(dateString, tz).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  })
}

export function formatDashboardDateLong(locale: string, timeZone?: string): string {
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(timeZone ? { timeZone: zonaIANASegura(timeZone) } : {}),
  })
}

/** Etiqueta de día para la lista de próximas citas: "Hoy" / "Mañana" / día de semana. */
export function formatUpcomingDayLabel(
  apptDate: Date,
  today: Date,
  tomorrow: Date,
  locale: string,
  timeZone: string
): string {
  const tz = zonaIANASegura(timeZone)
  if (esMismoDiaCalendarioEnZona(apptDate, today, tz)) return 'Hoy'
  if (esMismoDiaCalendarioEnZona(apptDate, tomorrow, tz)) return 'Mañana'
  const label = apptDate.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: tz,
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
