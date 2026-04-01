"use client";

import { useEffect, useState } from "react";

import { useCreatePack, useUpdatePack } from "@/hooks/servicios/usePacks";
import type { Pack } from "../../_services/packsService";
import { ServicePickerCheckbox } from "./ServicePickerCheckbox";

interface Props {
  open: boolean;
  pack?: Pack | null;
  onClose: () => void;
}

type FormState = {
  name: string;
  description: string;
  price: string;
  service_ids: string[];
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  description: "",
  price: "",
  service_ids: [],
  is_active: true,
};

export function PackFormModal({ open, pack, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const create = useCreatePack();
  const update = useUpdatePack();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (pack) {
      setForm({
        name: pack.name,
        description: pack.description ?? "",
        price: String(pack.price).replace(".", ","),
        service_ids: pack.service_ids,
        is_active: pack.is_active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [pack, open]);

  async function handleSubmit() {
    const price = Number.parseFloat(form.price.replace(",", "."));
    if (!form.name.trim() || Number.isNaN(price)) return;

    const input = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      service_ids: form.service_ids,
      is_active: form.is_active,
    };

    if (pack) {
      await update.mutateAsync({ id: pack.id, input });
    } else {
      await create.mutateAsync(input);
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-[#1a1d26] p-6">
        <h2 className="text-lg font-semibold text-white">
          {pack ? "Editar pack" : "Nuevo pack"}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Nombre *</label>
            <input
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Pack novias"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">
              Descripción
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              placeholder="Opcional"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">Precio *</label>
            <input
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
              value={form.price}
              onChange={(e) =>
                setForm((f) => ({ ...f, price: e.target.value }))
              }
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">
              Servicios incluidos ({form.service_ids.length} seleccionados)
            </label>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
              <ServicePickerCheckbox
                selectedIds={form.service_ids}
                onChange={(ids) => setForm((f) => ({ ...f, service_ids: ids }))}
              />
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
            <span className="text-sm text-white/70">Activo</span>
          </label>
        </div>

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
            className="rounded-lg bg-[#40E0D0] px-4 py-2 text-sm text-white transition-colors hover:bg-[#00897B] disabled:opacity-50"
          >
            {isPending ? "Guardando..." : pack ? "Actualizar" : "Crear pack"}
          </button>
        </div>
      </div>
    </div>
  );
}
