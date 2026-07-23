import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import type { UnassignedAppointment } from "../types";

export function useAsignarData() {
  const { config } = useTenant();
  const queryClient = useQueryClient();

  // Empleados activos para el picker
  const { data: employees = [] } = useQuery<
    { id: string; name: string; color: string }[]
  >({
    queryKey: ["employees", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, color")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // Servicios para enriquecer nombres
  const { data: services = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // Citas sin profesional — próximos 7 días usando timezone del tenant
  const {
    data: rawUnassigned = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<UnassignedAppointment[]>({
    queryKey: ["badges", "unassigned_next_7_days"],
    queryFn: async () => {
      const now = new Date();
      const end = new Date();
      end.setDate(now.getDate() + 7);

      const { data, error } = await supabase
        .from("appointments")
        .select("id, client_name, date, price, service_id, notes")
        .gte("date", now.toISOString())
        .lt("date", end.toISOString())
        .neq("status", "cancelled")
        .is("employee_id", null)
        .order("date", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as UnassignedAppointment[];
    },
    refetchInterval: 30_000,
  });

  // Enriquecer nombres en memoria
  const serviceById = Object.fromEntries(services.map((s) => [s.id, s]));

  const unassigned: UnassignedAppointment[] = rawUnassigned.map((apt) => ({
    ...apt,
    serviceName: apt.service_id
      ? (serviceById[apt.service_id]?.name ?? "—")
      : "—",
  }));

  // Mutación: asignar profesional a una cita
  const assignMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      employeeId,
    }: {
      appointmentId: string;
      employeeId: string;
    }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ employee_id: employeeId })
        .eq("id", appointmentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["badges", "unassigned_next_7_days"],
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  return {
    employees,
    unassigned,
    isLoading,
    isError,
    refetch,
    assignMutation,
    config,
  };
}
