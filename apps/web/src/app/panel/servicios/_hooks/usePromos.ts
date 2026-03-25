"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPromotion,
  deletePromotion,
  fetchPromotions,
  togglePromoActive,
  updatePromotion,
  type Promotion,
  type PromotionInput,
  type PromoItemInput,
} from "../_services/promosService";

export const PROMOS_KEY = ["promotions"] as const;

export function usePromos() {
  return useQuery({
    queryKey: PROMOS_KEY,
    queryFn: fetchPromotions,
  });
}

export function useCreatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      items,
    }: {
      input: PromotionInput;
      items: PromoItemInput[];
    }) => createPromotion(input, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMOS_KEY }),
  });
}

export function useUpdatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
      items,
    }: {
      id: string;
      input: Partial<PromotionInput>;
      items?: PromoItemInput[];
    }) => updatePromotion(id, input, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMOS_KEY }),
  });
}

export function useDeletePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROMOS_KEY }),
  });
}

export function useTogglePromoActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      togglePromoActive(id, is_active),
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: PROMOS_KEY });
      const prev = qc.getQueryData<Promotion[]>(PROMOS_KEY);
      qc.setQueryData<Promotion[]>(
        PROMOS_KEY,
        (old) => old?.map((p) => (p.id === id ? { ...p, is_active } : p)) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(PROMOS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PROMOS_KEY }),
  });
}
