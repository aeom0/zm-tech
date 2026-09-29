export type VerificationAction = 'approved' | 'rejected'

export type ValidacionFilter = 'pending' | 'approved' | 'rejected'

export interface ValidacionItem {
  id: string
  client_name: string
  /** Fecha de la cita, en texto de BD (sin zona). */
  date: string
  price: number
  serviceName: string
  employeeName?: string
  employeeColor?: string
  status: ValidacionFilter
  /** Cuándo se aprobó o rechazó (solo historial). */
  resolvedAt?: string | null
  /** Sin botones de acción: historial, o pago pendiente que se resuelve desde WhatsApp. */
  readOnly: boolean
}

export interface RowLoadingState {
  [appointmentId: string]: VerificationAction | null
}
