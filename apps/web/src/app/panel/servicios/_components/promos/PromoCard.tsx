"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { useDeletePromo, useTogglePromoActive } from "../../_hooks/usePromos";
import type { Promotion } from "../../_services/promosService";
import { SavingIndicator } from "../shared/SavingIndicator";

interface Props {
  promo: Promotion;
  onEdit: (promo: Promotion) => void;
}

export function PromoCard({ promo, onEdit }: Props) {
  const deletePromo = useDeletePromo();
  const toggleActive = useTogglePromoActive();
  const [savingState, setSavingState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  async function handleToggle() {
    setSavingState("saving");
    try {
      await toggleActive.mutateAsync({
        id: promo.id,
        is_active: !promo.is_active,
      });
      setSavingState("saved");
      setTimeout(() => setSavingState("idle"), 2000);
    } catch {
      setSavingState("error");
      setTimeout(() => setSavingState("idle"), 3000);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Eliminar la promo "${promo.title}"? Se eliminaran sus items.`,
      )
    )
      return;
    setSavingState("saving");
    try {
      await deletePromo.mutateAsync(promo.id);
    } catch {
      setSavingState("error");
      setTimeout(() => setSavingState("idle"), 3000);
    }
  }

  const itemCount = promo.promotion_items?.length ?? 0;
  const isExpired = promo.expires_at
    ? new Date(promo.expires_at) < new Date()
    : false;

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-4 transition-opacity ${
        !promo.is_active || isExpired ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-medium text-white">
              {promo.title}
            </h3>

            {promo.badge ? (
              <span
                className="rounded px-1.5 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: promo.accent_color
                    ? `${promo.accent_color}33`
                    : "#E91E8C33",
                  color: promo.accent_color ?? "#fda4af",
                }}
              >
                {promo.badge}
              </span>
            ) : null}

            {isExpired ? (
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                Vencida
              </span>
            ) : null}
          </div>

          {promo.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-white/50">
              {promo.description}
            </p>
          ) : null}

          <p className="mt-1 text-sm font-semibold text-[#E91E8C]">
            {Number(promo.promo_price).toLocaleString("es-VE", {
              minimumFractionDigits: 2,
            })}
          </p>

          <p className="mt-0.5 text-xs text-white/30">
            {itemCount} item{itemCount !== 1 ? "s" : ""}
            {promo.expires_at ? (
              <span className="ml-2">
                . vence {new Date(promo.expires_at).toLocaleDateString("es-VE")}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <SavingIndicator state={savingState} />

          <button
            type="button"
            onClick={() => void handleToggle()}
            className={`relative inline-flex h-4 w-8 shrink-0 rounded-full transition-colors ${
              promo.is_active ? "bg-[#E91E8C]" : "bg-white/20"
            }`}
            aria-label={promo.is_active ? "Desactivar promo" : "Activar promo"}
          >
            <span
              className={`absolute top-0.5 block h-3 w-3 rounded-full bg-white transition-[left] ${
                promo.is_active ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => onEdit(promo)}
            className="p-1.5 text-white/40 transition-colors hover:text-white"
            aria-label="Editar promo"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deletePromo.isPending}
            className="p-1.5 text-white/40 transition-colors hover:text-red-400 disabled:opacity-30"
            aria-label="Eliminar promo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
