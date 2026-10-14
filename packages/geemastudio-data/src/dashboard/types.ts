export interface DashboardStats {
  todayRevenue: number
  completedAppointments: number
  upcomingAppointments: number
  lowStockItems: number
}

/** Límites del día del tenant: pagos en ISO (timestamptz), citas en texto de pared. */
export interface DashboardDayRange {
  paymentFrom: string
  paymentTo: string
  appointmentFrom: string
  appointmentTo: string
}

export interface DashboardAppointment {
  id: string
  client_name: string
  date: string
  duration: number
  price: string
  status: string
  employee_id: string
  service_id: string
  service_ids?: string[] | null
}

export interface DashboardPayment {
  id: string
  appointment_id: string | null
  amount: string
  is_abono: boolean
}

export interface CompletedServiceRef {
  service_id: string | null
  service_ids: string[] | null
}

export interface DashboardTopService {
  id: string
  name: string
  count: number
}

export type TopServicesPeriod = 'month' | 'all'
