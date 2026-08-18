export interface UnassignedAppointment {
  id: string
  client_name: string
  date: string
  price: number
  service_id: string | null
  notes: string | null
  // enriquecidos en memoria
  serviceName?: string
}

export interface RowAssignState {
  [appointmentId: string]: boolean // true = guardando
}
