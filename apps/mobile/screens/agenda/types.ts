/** Tipos locales de Agenda (alineados con columnas Supabase en snake_case) */

export interface AgendaAppointment {
  id: string;
  client_name: string;
  client_phone?: string | null;
  client_document?: string | null;
  date: string;
  duration: number;
  price: string;
  status: string;
  employee_id: string;
  service_id: string;
}

export interface AgendaEmployee {
  id: string;
  name: string;
  color: string;
  role: string;
  avatar_url?: string | null;
}

export interface AgendaService {
  id: string;
  name: string;
  price: string;
  duration: number;
  category_id: string;
}

export interface AgendaServiceCategory {
  id: string;
  name: string;
  order: number;
}

export type AgendaStatusFilter = "all" | "scheduled" | "completed";

export interface AgendaFormState {
  clientName: string;
  clientPhone: string;
  clientDocument: string;
  categoryId: string;
  serviceId: string;
  employeeId: string;
}

export const emptyAgendaForm = (): AgendaFormState => ({
  clientName: "",
  clientPhone: "",
  clientDocument: "",
  categoryId: "",
  serviceId: "",
  employeeId: "",
});
