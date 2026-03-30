import { Colors } from "@/constants/theme";
import {
  esMismoDiaCalendarioEnZona,
  esHoyEnZonaIANA,
  horaCalendarioEnZona,
} from "@salonpro/tenant-config";

import type {
  AgendaAppointment,
  AgendaEmployee,
  AgendaService,
  AgendaStatusFilter,
} from "./types";

/** Comparación de día calendario en zona IANA del tenant. */
export function isSameCalendarDay(
  a: Date,
  b: Date,
  timeZone: string,
): boolean {
  return esMismoDiaCalendarioEnZona(a, b, timeZone);
}

export function isToday(date: Date, timeZone: string): boolean {
  return esHoyEnZonaIANA(date, timeZone);
}

export function getAppointmentsForSlot(
  appointments: AgendaAppointment[],
  date: Date,
  hour: number,
  statusFilter: AgendaStatusFilter,
  timeZone: string,
): AgendaAppointment[] {
  return appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    const sameDay = esMismoDiaCalendarioEnZona(aptDate, date, timeZone);
    const sameHour = horaCalendarioEnZona(aptDate, timeZone) === hour;
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
  timeZone: string,
): AgendaAppointment[] {
  return appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    const sameDay = esMismoDiaCalendarioEnZona(aptDate, date, timeZone);
    const sameHour = horaCalendarioEnZona(aptDate, timeZone) === hour;
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
