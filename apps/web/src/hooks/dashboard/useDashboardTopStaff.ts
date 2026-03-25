"use client";

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { DateRange } from "./useDashboardPeriod";

export interface TopStaffEntry {
  employeeId: string;
  name: string;
  color: string | null;
  revenue: number;
}

/**
 * Top por ingresos: `public.payments` no define `employee_id` (mismo criterio que Drizzle).
 * Aquí se enlaza `appointment_id` → `appointments.employee_id` en memoria, sin joins anidados en PostgREST.
 */
export function useDashboardTopStaff(dateRange: DateRange) {
  return useQuery({
    queryKey: ["dashboard_top_staff", dateRange],
    enabled: !!supabase && !!dateRange.from && !!dateRange.to,
    queryFn: async (): Promise<TopStaffEntry[]> => {
      if (!supabase) return [];

      const fromIso = `${dateRange.from}T00:00:00`;
      const toIso = `${dateRange.to}T23:59:59.999`;

      const [paymentsRes, employeesRes] = await Promise.all([
        supabase
          .from("payments")
          .select("appointment_id, amount")
          .gte("date", fromIso)
          .lte("date", toIso)
          .eq("is_abono", false),
        supabase
          .from("employees")
          .select("id, name, color")
          .eq("is_active", true),
      ]);

      if (paymentsRes.error) throw new Error(paymentsRes.error.message);
      if (employeesRes.error) throw new Error(employeesRes.error.message);

      const payments = paymentsRes.data ?? [];
      const appointmentIds = [
        ...new Set(
          payments
            .map((p) => (p as { appointment_id: string | null }).appointment_id)
            .filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            ),
        ),
      ];

      if (appointmentIds.length === 0) return [];

      const { data: aptRows, error: aptError } = await supabase
        .from("appointments")
        .select("id, employee_id")
        .in("id", appointmentIds);

      if (aptError) throw new Error(aptError.message);

      const employeeByAppointment = new Map<string, string | null>();
      for (const row of aptRows ?? []) {
        const r = row as { id: string; employee_id: string | null };
        employeeByAppointment.set(r.id, r.employee_id);
      }

      const revenueByEmployee = new Map<string, number>();
      for (const p of payments) {
        const pr = p as { appointment_id: string | null; amount: string };
        if (!pr.appointment_id) continue;
        const empId = employeeByAppointment.get(pr.appointment_id);
        if (!empId) continue;
        const amt = Number.parseFloat(pr.amount);
        revenueByEmployee.set(empId, (revenueByEmployee.get(empId) ?? 0) + amt);
      }

      const employees = employeesRes.data ?? [];
      const byId = new Map<string, { name: string; color: string | null }>();
      for (const e of employees) {
        const row = e as { id: string; name: string; color: string | null };
        byId.set(row.id, { name: row.name, color: row.color });
      }

      const entries: TopStaffEntry[] = [];
      for (const [employeeId, revenue] of revenueByEmployee) {
        const meta = byId.get(employeeId);
        entries.push({
          employeeId,
          name: meta?.name ?? "Profesional",
          color: meta?.color ?? null,
          revenue,
        });
      }

      entries.sort((a, b) => b.revenue - a.revenue);
      return entries.slice(0, 5);
    },
  });
}
