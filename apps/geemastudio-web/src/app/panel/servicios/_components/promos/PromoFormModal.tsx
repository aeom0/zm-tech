"use client";

import { useState } from "react";

import { useCreatePromo, useUpdatePromo } from "@/hooks/servicios/usePromos";
import type { PromoItemInput, Promotion } from "../../_services/promosService";
import { LUNARIS } from "@/lib/theme";
import { PromoItemRow } from "./PromoItemRow";

interface Props {
  open: boolean;
  promo?: Promotion | null;
  onClose: () => void;
}

type FormState = {
  title: string;
  description: string;
  badge: string;
  accent_color: string;
  promo_price: string;
  is_active: boolean;
  expires_at: string;
};

const EMPTY: FormState = {
  title: "",
  description: "",
  badge: "",
  accent_color: LUNARIS.primary,
  promo_price: "",
  is_active: true,
  expires_at: "",
};

const EMPTY_ITEM: PromoItemInput = {
  item_type: "service",
  item_id: "",
  quantity: 1,
  discounted_price: 0,
};

function formFromPromo(promo: Promotion): FormState {
  return {
    title: promo.title,
    description: promo.description ?? "",
    badge: promo.badge ?? "",
    accent_color: promo.accent_color ?? LUNARIS.primary,
    promo_price: String(promo.promo_price).replace(".", ","),
    is_active: promo.is_active,
    expires_at: promo.expires_at ? promo.expires_at.split("T")[0] : "",
  };
}

function itemsFromPromo(promo: Promotion): PromoItemInput[] {
  return (
    promo.promotion_items?.map((i) => ({
      item_type: i.item_type,
      item_id: i.item_id,
      quantity: i.quantity,
      discounted_price: i.discounted_price,
    })) ?? []
  );
}

export function PromoFormModal({ open, promo, onClose }: Props) {
  if (!open) return null;

  return (
    <PromoFormModalInner
      key={promo?.id ?? "new"}
      promo={promo}
      onClose={onClose}
    />
  );
}

function PromoFormModalInner({
  promo,
  onClose,
}: {
  promo?: Promotion | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    promo ? formFromPromo(promo) : EMPTY,
  );
  const [items, setItems] = useState<PromoItemInput[]>(() =>
    promo ? itemsFromPromo(promo) : [],
  );

  const create = useCreatePromo();
  const update = useUpdatePromo();
  const isPending = create.isPending || update.isPending;

  function updateItem(index: number, item: PromoItemInput) {
    setItems((prev) => prev.map((it, i) => (i === index ? item : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const promo_price = Number.parseFloat(form.promo_price.replace(",", "."));
    if (!form.title.trim() || Number.isNaN(promo_price)) return;

    const validItems = items.filter((i) => i.item_id);

    const input = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      badge: form.badge.trim() || null,
      accent_color: form.accent_color || null,
      promo_price,
      is_active: form.is_active,
      expires_at: form.expires_at
        ? new Date(`${form.expires_at}T12:00:00`).toISOString()
        : null,
    };

    if (promo) {
      await update.mutateAsync({ id: promo.id, input, items: validItems });
    } else {
      await create.mutateAsync({ input, items: validItems });
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#1a1d26] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">
          {promo ? "Editar promo" : "Nueva promo"}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-white/50">Titulo *</label>
            <input
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Ej: Promo San Valentin"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">Badge</label>
            <input
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
              value={form.badge}
              onChange={(e) =>
                setForm((f) => ({ ...f, badge: e.target.value }))
              }
              placeholder="HOT, NUEVO..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">
              Color badge
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accent_color}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accent_color: e.target.value }))
                }
                className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
              />
              <span className="text-xs text-white/40">{form.accent_color}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">
              Precio total promo *
            </label>
            <input
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
              value={form.promo_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, promo_price: e.target.value }))
              }
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">Expira</label>
            <input
              type="date"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
              value={form.expires_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, expires_at: e.target.value }))
              }
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-xs text-white/50">
              Descripcion
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              placeholder="Texto visible al cliente"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs text-white/50">Items de la promo</label>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
              className="text-xs text-[#40E0D0] transition-colors hover:text-[#5ee8dc]"
            >
              + Agregar item
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, i) => (
              <PromoItemRow
                key={`${i}-${item.item_type}-${item.item_id}`}
                item={item}
                index={i}
                onChange={updateItem}
                onRemove={removeItem}
              />
            ))}
            {items.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/20">
                Sin items: agrega servicios o packs con precio especial
              </p>
            ) : null}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm((f) => ({ ...f, is_active: e.target.checked }))
            }
            className="accent-[#40E0D0]"
          />
          <span className="text-sm text-white/70">Activa</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded-lg bg-[#40E0D0] text-white transition-colors hover:bg-[#00897B] disabled:opacity-50"
          >
            {isPending ? "Guardando..." : promo ? "Actualizar" : "Crear promo"}
          </button>
        </div>
      </div>
    </div>
  );
}
