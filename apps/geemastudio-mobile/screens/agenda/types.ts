/** Tipos locales de Agenda (alineados con columnas Supabase en snake_case) */

export interface AgendaAppointment {
  id: string
  client_name: string
  client_phone?: string | null
  client_document?: string | null
  date: string
  duration: number
  price: string
  status: string
  employee_id: string
  service_id: string
}

export interface AgendaEmployee {
  id: string
  name: string
  color: string
  avatar_url?: string | null
}

export interface AgendaService {
  id: string
  name: string
  price: string
  duration: number
  category_id: string
}

export interface AgendaServiceCategory {
  id: string
  name: string
  order: number
}

/** Línea de servicio del formulario (nueva cita o edición) — una por servicio+profesional */
export interface AgendaServiceLine {
  serviceId: string
  employeeId: string
  /** Si la línea proviene de un pack, el id del pack */
  packId?: string
  /**
   * Monto de esta línea al guardar (para packs: reparto equitativo del total del pack;
   * no se deriva de la suma de precios de catálogo de los servicios incluidos).
   */
  priceOverride?: number
}

/** Pack de servicios (tabla `packs`): se expande a N `AgendaServiceLine` al agregarlo */
export interface AgendaPack {
  id: string
  name: string
  description?: string | null
  price: string
  service_ids: string[]
  is_active: boolean
}

/** Fila de `appointment_services` tal como llega de Supabase */
export interface AgendaAppointmentServiceLine {
  id: string
  appointment_id: string
  service_id: string | null
  employee_id: string | null
  pack_id: string | null
  price: string
  duration: number
}

/**
 * all       → todas las citas
 * scheduled → pendientes (status = 'scheduled')
 * completed → completadas
 * cancelled → canceladas + no_show
 */
export type AgendaStatusFilter = 'all' | 'scheduled' | 'completed' | 'cancelled'

/** Vista del owner: día individual o semana completa */
export type OwnerViewMode = 'day' | 'week'

export interface AgendaFormState {
  clientName: string
  clientPhone: string
  clientDocument: string
  categoryId: string
  /** Empleado por defecto asignado a cada nueva línea que se agregue (no el único de la cita) */
  employeeId: string
  serviceLines: AgendaServiceLine[]
}

export const emptyAgendaForm = (): AgendaFormState => ({
  clientName: '',
  clientPhone: '',
  clientDocument: '',
  categoryId: '',
  employeeId: '',
  serviceLines: [],
})
