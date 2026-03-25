"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { useDeletePack, useTogglePackActive } from "../../_hooks/usePacks";
import type { Pack } from "../../_services/packsService";
import { SavingIndicator } from "../shared/SavingIndicator";

interface Props {
  pack: Pack;
  onEdit: (pack: Pack) => void;
}

export function PackCard({ pack, onEdit }: Props) {
  const deletePack = useDeletePack();
  const toggleActive = useTogglePackActive();
  const [savingState, setSavingState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  async function handleToggle() {
    setSavingState("saving");
    try {
      await toggleActive.mutateAsync({
        id: pack.id,
        is_active: !pack.is_active,
      });
      setSavingState("saved");
      setTimeout(() => setSavingState("idle"), 2000);
    } catch {
      setSavingState("error");
      setTimeout(() => setSavingState("idle"), 3000);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Eliminar el pack \"${pack.name}\"?`)) return;
    setSavingState("saving");
    try {
      await deletePack.mutateAsync(pack.id);
    } catch {
      setSavingState("error");
      setTimeout(() => setSavingState("idle"), 3000);
    }
  }

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-4 transition-opacity ${!pack.is_active ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-white">
            {pack.name}
          </h3>
          {pack.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-white/50">
              {pack.description}
            </p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-[#E91E8C]">
            {Number(pack.price).toLocaleString("es-VE", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="mt-0.5 text-xs text-white/30">
            {pack.service_ids.length} servicio
            {pack.service_ids.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <SavingIndicator state={savingState} />
          <button
            type="button"
            onClick={() => void handleToggle()}
            className={`relative h-4 w-8 rounded-full transition-colors ${pack.is_active ? "bg-[#E91E8C]" : "bg-white/20"}`}
            aria-label={pack.is_active ? "Desactivar pack" : "Activar pack"}
          >
            <span
              className={`absolute top-0.5 block h-3 w-3 rounded-full bg-white transition-transform ${pack.is_active ? "left-[18px]" : "left-0.5"}`}
            />
          </button>
          <button
            type="button"
            onClick={() => onEdit(pack)}
            className="p-1.5 text-white/40 transition-colors hover:text-white"
            aria-label="Editar pack"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deletePack.isPending}
            className="p-1.5 text-white/40 transition-colors hover:text-red-400 disabled:opacity-30"
            aria-label="Eliminar pack"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
