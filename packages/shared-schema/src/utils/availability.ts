import type { EmployeeTimeOffKind } from '../schema'

/** Etiquetas (es LATAM neutro) de los tipos de ausencia. */
export const TIME_OFF_KIND_LABELS: Record<EmployeeTimeOffKind, string> = {
  vacation: 'Vacaciones',
  permission: 'Permiso',
  sick_leave: 'Enfermedad',
  personal: 'Asunto personal',
  training: 'Capacitación',
  day_off: 'Día libre',
  other: 'Otro',
}

/** Orden de la semana en UI (lunes primero). Valor = weekday de BD (0 = domingo). */
export const WEEK_DAYS: readonly { weekday: number; label: string; short: string }[] = [
  { weekday: 1, label: 'Lunes', short: 'Lun' },
  { weekday: 2, label: 'Martes', short: 'Mar' },
  { weekday: 3, label: 'Miércoles', short: 'Mié' },
  { weekday: 4, label: 'Jueves', short: 'Jue' },
  { weekday: 5, label: 'Viernes', short: 'Vie' },
  { weekday: 6, label: 'Sábado', short: 'Sáb' },
  { weekday: 0, label: 'Domingo', short: 'Dom' },
]

/** 'HH:MM:SS' de Postgres → 'HH:MM'. */
export function trimTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : ''
}
