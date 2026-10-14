export type AgendaStatusFilter = 'all' | 'scheduled' | 'completed' | 'cancelled'

/** Columnas de `appointments` que usan las vistas de agenda (día, semana, detalle). */
export const AGENDA_APPOINTMENT_COLUMNS =
  'id, client_id, client_name, client_phone, date, duration, price, status, employee_id, service_id, service_ids, cancel_reason, cancel_note, cancelled_at, reference_image_paths, reference_received_at, reference_reviewed_at, client_confirmed_at'

export interface AgendaAppointment {
  id: string
  client_id?: string | null
  client_name: string
  client_phone: string | null
  client_document?: string | null
  date: string
  duration: number
  price: string
  status: string
  employee_id: string | null
  service_id: string | null
  service_ids: string[] | null
  cancel_reason?: string | null
  cancel_note?: string | null
  cancelled_at?: string | null
  reference_image_paths?: string[] | null
  reference_received_at?: string | null
  reference_reviewed_at?: string | null
  /** La clienta confirmó (botón del recordatorio WABA o marcado desde el panel). */
  client_confirmed_at?: string | null
  created_at?: string
  tenant_id?: string
}

export interface AgendaService {
  id: string
  name: string
  price: string | number
  duration: number
  is_active?: boolean
  category_id?: string | null
}

export interface AgendaPack {
  id: string
  name: string
  price: string | number
  service_ids: string[]
  is_active: boolean
}

export interface AgendaServiceLine {
  serviceId: string
  employeeId: string
  packId?: string
  promoId?: string
  priceOverride?: number
}

export interface AppointmentCreateInput {
  client_name: string
  client_phone?: string | null
  client_document?: string | null
  date: string
  status?: string
  lines: AgendaServiceLine[]
  tenantId: string
  timeZone: string
}

export interface AppointmentRescheduleInput {
  id: string
  date: string
  employee_id: string
  employeeIds?: string[]
  duration: number
  timeZone: string
}

export interface AppointmentCancelInput {
  id: string
  reason: string
  note?: string | null
  timeZone: string
}

export interface AppointmentServiceItemRow {
  id: string
  appointment_id: string
  service_id: string
  employee_id: string | null
  packId?: string | null
  price: string | number
  duration: number
}
