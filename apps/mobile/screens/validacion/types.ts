export interface PendingAppointment {
  id: string;
  client_name: string;
  date: string;
  price: number;
  service_id: string | null;
  employee_id: string | null;
  notes: string | null;
  // enriquecidos en memoria
  serviceName?: string;
  employeeName?: string;
  employeeColor?: string;
}

export type VerificationAction = "approved" | "rejected";

export interface RowLoadingState {
  [appointmentId: string]: VerificationAction | null;
}
