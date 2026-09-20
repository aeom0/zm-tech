export type AsignarPeriod = 'upcoming' | 'past'

export interface AsignarAppointment {
  id: string
  client_name: string
  date: string
  price: number
  service_id: string | null
  employee_id: string | null
  status: string
  notes: string | null
  // enriquecidos en memoria
  serviceName?: string
  employeeName?: string
  employeeColor?: string
}

export interface RowAssignState {
  [appointmentId: string]: boolean // true = guardando
}
