export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ClientWithMetrics extends Client {
  total_visits: number;
  total_spent: number;
  last_visit_date: string | null;
  favorite_service: string | null;
  days_since_last_visit: number | null;
  is_vip: boolean;
  is_new: boolean;
  is_at_risk: boolean;
}

export type ClientSegment = "all" | "vip" | "regular" | "at_risk" | "new";

export interface ClientKPIs {
  total_clients: number;
  active_this_month: number;
  vip_count: number;
  at_risk_count: number;
  avg_ticket: number;
}

export interface AppointmentService {
  name: string;
  category_color: string | null;
}

export interface AppointmentHistory {
  id: string;
  date: string;
  status: string;
  price: string | null;
  employee_name: string | null;
  employee_color: string | null;
  services: AppointmentService[];
  total_paid: number;
  pending_amount: number;
}
