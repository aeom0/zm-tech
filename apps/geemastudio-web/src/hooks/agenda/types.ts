import type { AgendaAppointment as SharedAgendaAppointment } from '@geemastudio/data'

export type AgendaStatusFilter = 'all' | 'scheduled' | 'completed' | 'cancelled'

export type AgendaAppointment = SharedAgendaAppointment

export interface AgendaEmployeeCol {
  id: string
  name: string
  color: string
  avatar_url: string | null
}

export interface AgendaServiceMap {
  id: string
  name: string
}

export const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
  payment_submitted: 'Pago enviado',
  confirmed: 'Confirmada',
}

export const STATUS_CHIP: { id: AgendaStatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'scheduled', label: 'Pendientes' },
  { id: 'completed', label: 'Completadas' },
  { id: 'cancelled', label: 'Canceladas' },
]

export function matchesStatusFilter(status: string, filter: AgendaStatusFilter): boolean {
  // «Todas» no incluye canceladas: se consultan en el chip «Canceladas».
  if (filter === 'all') return status !== 'cancelled'
  if (filter === 'cancelled') return status === 'cancelled' || status === 'no_show'
  return status === filter
}

/** Alto de una hora en la grilla de día (igual que `HOUR_ROW_HEIGHT` de mobile). */
export const PX_PER_HOUR = 64
