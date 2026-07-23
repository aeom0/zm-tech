"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CategoriaRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  order: number;
}

export function useCategorias() {
  return useQuery({
    queryKey: ["web_categorias"],
    queryFn: async () => {
      if (!supabase) {
        throw new Error(
          "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local",
        );
      }

      const { data, error } = await supabase
        .from("service_categories")
        .select("id, name, color, icon, order")
        .order("order", { ascending: true });

      if (error) throw error;
      return data as CategoriaRow[];
    },
  });
}

export function useUpsertCategoria() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      cat: Partial<CategoriaRow> & { name: string; color: string },
    ) => {
      if (!supabase) throw new Error("Supabase no está configurado");

      if (cat.id) {
        const { error } = await supabase
          .from("service_categories")
          .update({ name: cat.name, color: cat.color, icon: cat.icon ?? null })
          .eq("id", cat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_categories").insert({
          name: cat.name,
          color: cat.color,
          icon: cat.icon ?? null,
          order: 99,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["web_categorias"] }),
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase no está configurado");
      const { error } = await supabase
        .from("service_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["web_categorias"] });
      qc.invalidateQueries({ queryKey: ["web_servicios"] });
    },
  });
}
