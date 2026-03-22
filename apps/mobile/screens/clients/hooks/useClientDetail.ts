import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

interface ClientAppointmentRow {
  id: string;
  date: string;
  status: string;
  service_name: string | null;
  employee_name: string | null;
  amount_paid: number;
}

interface ClientDetailMetrics {
  total_visits: number;
  total_spent: number;
  avg_ticket: number;
  favorite_service: string | null;
}

interface UseClientDetailResult {
  appointments: ClientAppointmentRow[];
  metrics: ClientDetailMetrics | null;
  isLoading: boolean;
  isError: boolean;
}

export function useClientDetail(
  clientId: string | null,
): UseClientDetailResult {
  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery<
    {
      id: string;
      date: string;
      status: string;
      service_name: string | null;
      employee_name: string | null;
      amount_paid: string;
    }[]
  >({
    queryKey: ["client_detail", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase.rpc(
        "get_client_appointments_with_payments",
        {
          p_client_id: clientId,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as {
        id: string;
        date: string;
        status: string;
        service_name: string | null;
        employee_name: string | null;
        amount_paid: string;
      }[];
    },
  });

  const appointments: ClientAppointmentRow[] = rows.map((row) => ({
    id: row.id,
    date: row.date,
    status: row.status,
    service_name: row.service_name,
    employee_name: row.employee_name,
    amount_paid: parseFloat(row.amount_paid ?? "0") || 0,
  }));

  let metrics: ClientDetailMetrics | null = null;

  if (appointments.length > 0) {
    const total_visits = appointments.length;
    const total_spent = appointments.reduce((sum, a) => sum + a.amount_paid, 0);
    const avg_ticket = total_visits > 0 ? total_spent / total_visits : 0;

    const serviceFrequency: Record<string, number> = {};
    for (const apt of appointments) {
      const name = apt.service_name;
      if (!name) continue;
      serviceFrequency[name] = (serviceFrequency[name] ?? 0) + 1;
    }
    const [favoriteName] =
      Object.entries(serviceFrequency).sort((a, b) => b[1] - a[1])[0] ?? [];

    metrics = {
      total_visits,
      total_spent,
      avg_ticket,
      favorite_service: favoriteName ?? null,
    };
  }

  return {
    appointments,
    metrics,
    isLoading,
    isError,
  };
}
