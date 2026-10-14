export type {
  DashboardAppointment,
  DashboardPayment,
  DashboardStats,
  DashboardTopService,
} from '@geemastudio/data'

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
