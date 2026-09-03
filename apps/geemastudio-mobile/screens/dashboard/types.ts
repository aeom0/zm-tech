export interface DashboardStats {
  todayRevenue: number
  completedAppointments: number
  upcomingAppointments: number
  lowStockItems: number
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
}

export interface DashboardEmployeeRow {
  id: string
  name: string
  color: string
  role?: string | null
}

export interface DashboardServiceRow {
  id: string
  name: string
  price: string
  duration: number
  category_id: string
}

export interface DashboardPayment {
  id: string
  appointment_id: string | null
  amount: string
  is_abono: boolean
}

export interface DashboardTopService {
  id: string
  name: string
  count: number
}
