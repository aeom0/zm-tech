import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { supabase } from "@/lib/supabase";
import type { Service, ServiceCategory } from "../types";
import { parsePriceInput, priceToDecimalString } from "../types";

export interface ServicePayload {
  name: string;
  category_id: string;
  price: string;
  duration: number;
  is_active: boolean;
}

export function useServicesData() {
  const queryClient = useQueryClient();

  const {
    data: services = [],
    isLoading: servicesLoading,
    isError: servicesError,
    refetch: refetchServices,
  } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category_id, price, duration, is_active")
        .order("created_at", { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as Service[];
    },
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery<ServiceCategory[]>({
    queryKey: ["service_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("id, name, order")
        .order("order", { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as ServiceCategory[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: ServicePayload) => {
      const { error } = await supabase.from("services").insert({
        name: payload.name,
        category_id: payload.category_id || null,
        price: priceToDecimalString(parsePriceInput(payload.price)),
        duration: payload.duration,
        is_active: payload.is_active,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services"] });
      void queryClient.invalidateQueries({ queryKey: ["packs"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ServicePayload;
    }) => {
      const { error } = await supabase
        .from("services")
        .update({
          name: payload.name,
          category_id: payload.category_id || null,
          price: priceToDecimalString(parsePriceInput(payload.price)),
          duration: payload.duration,
          is_active: payload.is_active,
        })
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services"] });
      void queryClient.invalidateQueries({ queryKey: ["packs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services"] });
      void queryClient.invalidateQueries({ queryKey: ["packs"] });
    },
    onError: (error: Error) => {
      Alert.alert(
        "No se pudo eliminar",
        error.message || "El servicio puede estar en uso (citas asociadas).",
      );
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("services")
        .update({ is_active })
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = categories.reduce(
        (m, c) => Math.max(m, c.order ?? 0),
        -1,
      );
      const { error } = await supabase.from("service_categories").insert({
        name: name.trim(),
        order: maxOrder + 1,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service_categories"] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("service_categories")
        .update({ name: name.trim() })
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service_categories"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_categories")
        .delete()
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service_categories"] });
      void queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error: Error) => {
      Alert.alert(
        "No se pudo eliminar",
        error.message ||
          "Puede haber servicios en esta categoría. Elimínalos o muévelos antes.",
      );
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let index = 0; index < orderedIds.length; index++) {
        const catId = orderedIds[index];
        const { error } = await supabase
          .from("service_categories")
          .update({ order: index })
          .eq("id", catId);
        if (error) {
          throw new Error(error.message);
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service_categories"] });
    },
  });

  const isLoading = servicesLoading || categoriesLoading;
  const isError = servicesError || categoriesError;

  const refetch = async () => {
    await refetchServices();
    await refetchCategories();
  };

  return {
    services,
    categories,
    isLoading,
    isError,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleActiveMutation,
    createCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
    reorderCategoriesMutation,
  };
}
