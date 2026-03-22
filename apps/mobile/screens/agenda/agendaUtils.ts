import { Colors } from "@/constants/theme";

import type {
  AgendaAppointment,
  AgendaEmployee,
  AgendaService,
  AgendaStatusFilter,
} from "./types";

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function isToday(date: Date): boolean {
  return isSameCalendarDay(date, new Date());
}

export function getAppointmentsForSlot(
  appointments: AgendaAppointment[],
  date: Date,
  hour: number,
  statusFilter: AgendaStatusFilter,
): AgendaAppointment[] {
  return appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    const sameDay = isSameCalendarDay(aptDate, date);
    const sameHour = aptDate.getHours() === hour;
    const statusMatches =
      statusFilter === "all" ? true : apt.status === statusFilter;
    return sameDay && sameHour && statusMatches;
  });
}

export function getAptsForEmpSlot(
  appointments: AgendaAppointment[],
  date: Date,
  hour: number,
  empId: string,
  statusFilter: AgendaStatusFilter,
): AgendaAppointment[] {
  return appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    const sameDay = isSameCalendarDay(aptDate, date);
    const sameHour = aptDate.getHours() === hour;
    const statusMatches =
      statusFilter === "all" ? true : apt.status === statusFilter;
    return sameDay && sameHour && statusMatches && apt.employee_id === empId;
  });
}

export function getEmployeeColor(
  employees: AgendaEmployee[],
  employeeId: string,
): string {
  const employee = employees.find((e) => e.id === employeeId);
  return employee?.color ?? Colors.light.violet;
}

export function getEmployeeFirstName(
  employees: AgendaEmployee[],
  employeeId: string,
): string {
  const employee = employees.find((e) => e.id === employeeId);
  return employee?.name?.split(" ")[0] ?? "";
}

export function getServiceName(
  services: AgendaService[],
  serviceId: string,
): string {
  const service = services.find((s) => s.id === serviceId);
  return service?.name ?? "";
}
