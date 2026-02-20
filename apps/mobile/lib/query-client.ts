import { QueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

/**
 * Mapa de queryKey → tabla de Supabase.
 * Las queries usan el formato ["/api/<recurso>"] o ["/api/<recurso>", "?params"].
 */
const ROUTE_TABLE_MAP: Record<string, string> = {
  "/api/employees": "employees",
  "/api/services": "services",
  "/api/service-categories": "service_categories",
  "/api/clients": "clients",
  "/api/appointments": "appointments",
  "/api/inventory": "inventory_items",
  "/api/payments": "payments",
};

function parseRoute(queryKey: readonly unknown[]): {
  table: string;
  params: URLSearchParams;
} {
  const route = String(queryKey[0]);
  const table = ROUTE_TABLE_MAP[route];
  if (!table) throw new Error(`Ruta no mapeada: ${route}`);

  const paramStr = queryKey.length > 1 ? String(queryKey[1]) : "";
  const params = new URLSearchParams(paramStr.replace(/^\?/, ""));
  return { table, params };
}

async function fetchDashboardStats() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [paymentsRes, appointmentsRes, inventoryRes] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .gte("date", startOfDay.toISOString())
      .lte("date", endOfDay.toISOString()),
    supabase
      .from("appointments")
      .select("status, date")
      .gte("date", startOfDay.toISOString())
      .lte("date", endOfDay.toISOString()),
    supabase.from("inventory_items").select("id, quantity, min_stock"),
  ]);

  const todayRevenue = (paymentsRes.data || []).reduce(
    (sum: number, p: { amount: string | number }) =>
      sum + (typeof p.amount === "number" ? p.amount : parseFloat(p.amount)),
    0,
  );
  const allApts = appointmentsRes.data || [];
  const completedAppointments = allApts.filter(
    (a: { status: string }) => a.status === "completed",
  ).length;
  const upcomingAppointments = allApts.filter(
    (a: { status: string }) => a.status === "scheduled",
  ).length;
  const lowStockItems = (inventoryRes.data || []).filter(
    (i: { quantity: number; min_stock: number }) => i.quantity <= i.min_stock,
  ).length;

  return {
    todayRevenue,
    completedAppointments,
    upcomingAppointments,
    lowStockItems,
  };
}

async function fetchDashboardRevenue() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount, date")
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString())
    .order("date", { ascending: true });

  const grouped: Record<string, number> = {};
  for (const p of allPayments || []) {
    const dateKey = new Date(p.date).toISOString().split("T")[0];
    grouped[dateKey] = (grouped[dateKey] || 0) + parseFloat(p.amount);
  }

  return Object.entries(grouped)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function supabaseQueryFn({ queryKey }: { queryKey: readonly unknown[] }) {
  const route = String(queryKey[0]);

  // Rutas especiales de dashboard
  if (route === "/api/dashboard/stats") return fetchDashboardStats();
  if (route === "/api/dashboard/revenue") return fetchDashboardRevenue();

  const { table, params } = parseRoute(queryKey);

  let query = supabase.from(table).select("*");

  // Filtro por fecha para appointments y payments
  if (table === "appointments" || table === "payments") {
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);
  }

  // Ordenar por defecto
  if (table === "service_categories") {
    query = query.order("order", { ascending: true });
  } else if (table === "services" || table === "employees") {
    query = query.order("created_at", { ascending: true });
  } else if (table === "appointments") {
    query = query.order("date", { ascending: true });
  } else if (table === "payments") {
    query = query.order("date", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Helper para mutaciones: POST, PUT, PATCH, DELETE contra Supabase.
 */
export async function apiRequest(
  method: string,
  route: string,
  body?: unknown,
): Promise<{ json: () => Promise<unknown> }> {
  // Extraer tabla y posible ID de la ruta
  // Soporta: /api/services, /api/services/:id, /api/inventory/:id/quantity
  const parts = route.split("/").filter(Boolean); // ["api", "resource", ":id?", "sub?"]
  const resource = parts.length >= 2 ? `/api/${parts[1]}` : route;
  const table = ROUTE_TABLE_MAP[resource];
  if (!table) throw new Error(`Ruta no mapeada: ${route}`);

  const id = parts.length >= 3 ? parts[2] : null;

  let result: { data: unknown; error: { message: string } | null };

  switch (method.toUpperCase()) {
    case "POST":
      result = await supabase
        .from(table)
        .insert(body as Record<string, unknown>)
        .select()
        .single();
      break;
    case "PUT":
      if (!id) throw new Error("PUT requiere un ID");
      result = await supabase
        .from(table)
        .update(body as Record<string, unknown>)
        .eq("id", id)
        .select()
        .single();
      break;
    case "PATCH":
      if (!id) throw new Error("PATCH requiere un ID");
      result = await supabase
        .from(table)
        .update(body as Record<string, unknown>)
        .eq("id", id)
        .select()
        .single();
      break;
    case "DELETE":
      if (!id) throw new Error("DELETE requiere un ID");
      result = await supabase.from(table).delete().eq("id", id);
      break;
    default:
      throw new Error(`Método no soportado: ${method}`);
  }

  if (result.error) throw new Error(result.error.message);

  return { json: async () => result.data };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: supabaseQueryFn as never,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
    mutations: {
      retry: false,
    },
  },
});
