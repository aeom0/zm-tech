"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ServicioRow {
  id: string;
  name: string;
  category_id: string;
  price: string;
  duration: number;
  is_active: boolean;
}

export function useServicios(categoryId?: string) {
  return useQuery({
    queryKey: ["web_servicios", categoryId ?? "all"],
    queryFn: async () => {
      if (!supabase) {
        throw new Error(
          "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local",
        );
      }

      let q = supabase
        .from("services")
        .select("id, name, category_id, price, duration, is_active")
        .order("name", { ascending: true });

      if (categoryId) q = q.eq("category_id", categoryId);

      const { data, error } = await q;
      if (error) throw error;
      return data as ServicioRow[];
    },
  });
}

export function useUpsertServicio() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      svc: Partial<ServicioRow> & {
        name: string;
        category_id: string;
        price: string;
        duration: number;
        is_active?: boolean;
      },
    ) => {
      if (!supabase) throw new Error("Supabase no está configurado");

      const normalizedPrice = String(svc.price).replace(",", ".");
      const payload = {
        name: svc.name,
        category_id: svc.category_id,
        price: normalizedPrice,
        duration: svc.duration,
        is_active: svc.is_active ?? true,
      };

      if (svc.id) {
        const { error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", svc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["web_servicios"] }),
  });
}

export function useToggleServicio() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!supabase) throw new Error("Supabase no está configurado");
      const { error } = await supabase
        .from("services")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["web_servicios"] }),
  });
}

export function useDeleteServicio() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase no está configurado");
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["web_servicios"] }),
  });
}

