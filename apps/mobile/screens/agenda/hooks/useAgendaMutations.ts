import { Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

export interface AgendaMutationCallbacks {
  onCreateSuccess: () => void;
  onDeleteSuccess: () => void;
  onUpdateSuccess: () => void;
}

export function useAgendaMutations(callbacks: AgendaMutationCallbacks) {
  const createMutation = useMutation({
    mutationFn: async (data: {
      client_name: string;
      client_phone?: string;
      client_document?: string;
      service_id: string;
      employee_id: string;
      date: string;
      duration: number;
      price: string;
      status: string;
    }) => {
      const payload = {
        client_name: data.client_name,
        client_phone: data.client_phone ?? null,
        client_document: data.client_document ?? null,
        service_id: data.service_id,
        employee_id: data.employee_id,
        date: data.date,
        duration: data.duration,
        price: data.price,
        status: data.status,
      };

      const { error } = await supabase.from("appointments").insert(payload);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      callbacks.onCreateSuccess();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo crear la cita");
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      callbacks.onDeleteSuccess();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo eliminar la cita");
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ date })
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      callbacks.onUpdateSuccess();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo reprogramar la cita");
    },
  });

  return {
    createMutation,
    deleteAppointmentMutation,
    updateAppointmentMutation,
  };
}
