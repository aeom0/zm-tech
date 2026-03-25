"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPack,
  deletePack,
  fetchPacks,
  togglePackActive,
  updatePack,
  type Pack,
  type PackInput,
} from "../_services/packsService";

export const PACKS_KEY = ["packs"] as const;

export function usePacks() {
  return useQuery({
    queryKey: PACKS_KEY,
    queryFn: fetchPacks,
  });
}

export function useCreatePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PackInput) => createPack(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PACKS_KEY }),
  });
}

export function useUpdatePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PackInput> }) =>
      updatePack(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PACKS_KEY }),
  });
}

export function useDeletePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePack(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PACKS_KEY }),
  });
}

export function useTogglePackActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      togglePackActive(id, is_active),
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: PACKS_KEY });
      const prev = qc.getQueryData<Pack[]>(PACKS_KEY);
      qc.setQueryData<Pack[]>(
        PACKS_KEY,
        (old) => old?.map((p) => (p.id === id ? { ...p, is_active } : p)) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(PACKS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PACKS_KEY }),
  });
}
