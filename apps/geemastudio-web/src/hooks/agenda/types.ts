export type AgendaStatusFilter = 'all' | 'scheduled' | 'completed' | 'cancelled'

export interface AgendaAppointment {
  id: string
  client_name: string
  client_phone: string | null
  date: string
  duration: number
  price: string
  status: string
  employee_id: string | null
  service_id: string | null
  service_ids: string[] | null
}

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
  if (filter === 'all') return true
  if (filter === 'cancelled') return status === 'cancelled' || status === 'no_show'
  return status === filter
}

export const PX_PER_HOUR = 72
