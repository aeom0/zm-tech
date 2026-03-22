"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ProximaCita {
  id: string;
  client_name: string;
  date: string;
  status: string;
  price: string;
  employee_id: string | null;
}

export interface TopServicioRow {
  name: string;
  count: number;
  revenue: number;
}

export interface DashboardData {
  citasHoy: number;
  citasCompletadasHoy: number;
  ingresoHoy: number;
  ingresoMes: number;
  citasMes: number;
  citasSinAsignar: number;
  pagosAbonoMes: number;
  revenueByDay: { day: string; total: number }[];
  proximasCitas: ProximaCita[];
  topServicios: TopServicioRow[];
  tenantBusinessName: string | null;
  currencySymbol: string;
  isLoading: boolean;
}

function startEndOfToday(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function startOfCurrentMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function startOfNextMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

function dayLabel(d: Date): string {
  const raw = d.toLocaleDateString("es-VE", { weekday: "short" });
  const cleaned = raw.replace(/\.$/, "").trim();
  return cleaned
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
    : "";
}

/**
 * YYYY-MM-DD en calendario **local del navegador** (agrupa pagos y etiquetas del gráfico).
 *
 * TODO (timezone del tenant): PostgREST devuelve `timestamptz` en UTC; al mapear con `new Date(iso)`
 * y `localDateKey` se interpreta en la zona del cliente. Si el negocio está en LATAM y el usuario
 * abre el panel en otra zona, o cerca de medianoche UTC, puede haber desfase de un día en los
 * extremos de la ventana de 7 días. Unificar cuando exista timezone configurable en tenant.
 */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const emptyData: Omit<DashboardData, "isLoading"> = {
  citasHoy: 0,
  citasCompletadasHoy: 0,
  ingresoHoy: 0,
  ingresoMes: 0,
  citasMes: 0,
  citasSinAsignar: 0,
  pagosAbonoMes: 0,
  revenueByDay: [],
  proximasCitas: [],
  topServicios: [],
  tenantBusinessName: null,
  currencySymbol: "$",
};

export function useDashboardData(): DashboardData {
  const [state, setState] =
    useState<Omit<DashboardData, "isLoading">>(emptyData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const sb = supabase;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (!user || cancelled) {
          if (!cancelled) setState(emptyData);
          return;
        }

        const { start: startOfToday, end: endOfToday } = startEndOfToday();
        const monthStart = startOfCurrentMonth();
        const nextMonthStart = startOfNextMonth();
        const now = new Date();

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [
          tenantRes,
          aptTodayRes,
          payTodayRes,
          payMonthRes,
          aptUnassignedRes,
          aptMonthCountRes,
          payWeekRes,
          aptMonthServicesRes,
          servicesRes,
          proximasRes,
        ] = await Promise.all([
          sb
            .from("tenant_settings")
            .select("business_name, currency_symbol")
            .eq("id", user.id)
            .maybeSingle(),
          sb
            .from("appointments")
            .select("id, status, price")
            .gte("date", startOfToday.toISOString())
            .lte("date", endOfToday.toISOString()),
          sb
            .from("payments")
            .select("amount, is_abono")
            .gte("date", startOfToday.toISOString())
            .lte("date", endOfToday.toISOString()),
          sb
            .from("payments")
            .select("amount, is_abono, appointment_id")
            .gte("date", monthStart.toISOString())
            .lt("date", nextMonthStart.toISOString()),
          sb
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .gte("date", monthStart.toISOString())
            .lt("date", nextMonthStart.toISOString())
            .is("employee_id", null),
          sb
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .gte("date", monthStart.toISOString())
            .lt("date", nextMonthStart.toISOString()),
          sb
            .from("payments")
            .select("amount, date, is_abono")
            .gte("date", sevenDaysAgo.toISOString())
            .lte("date", endOfToday.toISOString())
            .eq("is_abono", false),
          sb
            .from("appointments")
            .select("id, service_id, price")
            .gte("date", monthStart.toISOString())
            .lt("date", nextMonthStart.toISOString())
            .not("service_id", "is", null),
          sb.from("services").select("id, name, price"),
          sb
            .from("appointments")
            .select("id, client_name, date, status, price, employee_id")
            .gte("date", now.toISOString())
            .lte("date", endOfToday.toISOString())
            .in("status", ["scheduled", "confirmed"])
            .order("date", { ascending: true })
            .limit(5),
        ]);

        if (cancelled) return;

        const tenantRow = tenantRes.data;
        const tenantBusinessName = tenantRow?.business_name ?? null;
        const currencySymbol = tenantRow?.currency_symbol ?? "$";

        const aptToday = aptTodayRes.data ?? [];
        const citasHoy = aptToday.length;
        const citasCompletadasHoy = aptToday.filter(
          (a) => a.status === "completed",
        ).length;

        const payToday = payTodayRes.data ?? [];
        const ingresoHoy = payToday
          .filter((p) => !p.is_abono)
          .reduce((s, p) => s + parseFloat(p.amount), 0);

        const payMonth = payMonthRes.data ?? [];
        const ingresoMes = payMonth
          .filter((p) => !p.is_abono)
          .reduce((s, p) => s + parseFloat(p.amount), 0);
        const pagosAbonoMes = payMonth
          .filter((p) => p.is_abono)
          .reduce((s, p) => s + parseFloat(p.amount), 0);

        const citasSinAsignar = aptUnassignedRes.count ?? 0;
        const citasMes = aptMonthCountRes.count ?? 0;

        const payWeek = payWeekRes.data ?? [];
        const byDayKey: Record<string, number> = {};
        for (const p of payWeek) {
          const key = localDateKey(new Date(p.date as string));
          byDayKey[key] = (byDayKey[key] ?? 0) + parseFloat(p.amount);
        }

        const revenueByDay: { day: string; total: number }[] = [];
        for (let i = 0; i < 7; i++) {
          const day = new Date(sevenDaysAgo);
          day.setDate(sevenDaysAgo.getDate() + i);
          const key = localDateKey(day);
          revenueByDay.push({
            day: dayLabel(day),
            total: byDayKey[key] ?? 0,
          });
        }

        const aptMonth = aptMonthServicesRes.data ?? [];
        const serviceList = servicesRes.data ?? [];
        const serviceById: Record<string, { name: string; price: string }> = {};
        for (const s of serviceList) {
          serviceById[s.id] = { name: s.name, price: s.price };
        }

        const freq: Record<
          string,
          { name: string; count: number; revenue: number }
        > = {};
        for (const a of aptMonth) {
          const sid = a.service_id as string;
          const meta = serviceById[sid];
          const name = meta?.name ?? "Servicio";
          if (!freq[sid]) {
            freq[sid] = { name, count: 0, revenue: 0 };
          }
          freq[sid].count += 1;
          freq[sid].revenue += parseFloat(a.price as string);
        }

        const topServicios = Object.values(freq)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const proximasRaw = proximasRes.data ?? [];
        const proximasCitas: ProximaCita[] = proximasRaw.map((row) => ({
          id: row.id,
          client_name: row.client_name,
          date: row.date as string,
          status: row.status,
          price: row.price as string,
          employee_id: row.employee_id,
        }));

        setState({
          citasHoy,
          citasCompletadasHoy,
          ingresoHoy,
          ingresoMes,
          citasMes,
          citasSinAsignar,
          pagosAbonoMes,
          revenueByDay,
          proximasCitas,
          topServicios,
          tenantBusinessName,
          currencySymbol,
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...state,
    isLoading,
  };
}
