import { Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

export function useDashboardMutations() {
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { status: string };
    }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: data.status })
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
    onError: (e: Error) =>
      Alert.alert("Error", e.message || "No se pudo actualizar"),
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      appointment_id: string;
      amount: string;
      method: string;
      date: string;
      notes: string;
    }) => {
      const payload = {
        appointment_id: data.appointment_id,
        amount: data.amount,
        method: data.method,
        date: data.date,
        notes: data.notes,
        is_abono: false,
        service_total: null,
      };

      const { error } = await supabase.from("payments").insert(payload);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_revenue"] });
    },
    onError: (e: Error) =>
      Alert.alert("Error", e.message || "No se pudo registrar el pago"),
  });

  return { updateAppointmentMutation, createPaymentMutation };
}
