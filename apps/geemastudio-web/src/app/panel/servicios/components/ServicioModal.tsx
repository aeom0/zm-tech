"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import type { CategoriaRow } from "@/hooks/servicios/useCategorias";
import type { ServicioRow } from "@/hooks/servicios/useServicios";

export function ServicioModal({
  open,
  categorias,
  initial,
  defaultCategoryId,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean;
  categorias: CategoriaRow[];
  initial: ServicioRow | null;
  defaultCategoryId?: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    name: string;
    category_id: string;
    price: string;
    duration: number;
    is_active: boolean;
  }) => void;
}) {
  if (!open) return null;

  return (
    <ServicioModalForm
      key={initial?.id ?? `new-${defaultCategoryId ?? "none"}`}
      categorias={categorias}
      initial={initial}
      defaultCategoryId={defaultCategoryId}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function ServicioModalForm({
  categorias,
  initial,
  defaultCategoryId,
  isSaving,
  onClose,
  onSave,
}: {
  categorias: CategoriaRow[];
  initial: ServicioRow | null;
  defaultCategoryId?: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    name: string;
    category_id: string;
    price: string;
    duration: number;
    is_active: boolean;
  }) => void;
}) {
  const title = initial ? "Editar servicio" : "Nuevo servicio";

  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    initial?.category_id ?? defaultCategoryId ?? categorias[0]?.id ?? "",
  );
  const [price, setPrice] = useState(initial?.price ?? "");
  const [duration, setDuration] = useState(initial?.duration ?? 60);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!categoryId) return false;
    if (!String(price).trim()) return false;
    if (!Number.isFinite(duration) || duration <= 0) return false;
    return true;
  }, [name, categoryId, price, duration]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Precio en $ (USD) para el panel web.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] inline-flex items-center justify-center text-zinc-300 hover:bg-white/[0.06] transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Nombre
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-white/[0.10] bg-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#40E0D0] focus:border-transparent"
              placeholder="Ej. Manicure clásica"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Categoría
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.10] bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-[#40E0D0] focus:border-transparent"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Precio ($)
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.10] bg-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#40E0D0] focus:border-transparent"
                placeholder="15,50"
              />
              <div className="text-[11px] text-zinc-500 mt-1">
                Acepta coma: <span className="text-zinc-400">15,50</span> →{" "}
                <span className="text-zinc-400">15.50</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Duración (min)
              </label>
              <input
                type="number"
                step={15}
                min={15}
                value={duration}
                onChange={(e) =>
                  setDuration(parseInt(e.target.value || "0", 10))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.10] bg-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#40E0D0] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Activo
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={[
                  "w-full px-4 py-2.5 rounded-xl border transition-colors text-sm font-semibold",
                  isActive
                    ? "bg-[#40E0D0]/15 border-[#40E0D0]/30 text-[#40E0D0]"
                    : "bg-white/[0.03] border-white/[0.10] text-zinc-300",
                ].join(" ")}
              >
                {isActive ? "Activo" : "Inactivo"}
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/[0.10] bg-transparent text-zinc-200 hover:bg-white/[0.04] transition-colors text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit || isSaving}
            onClick={() =>
              onSave({
                id: initial?.id,
                name: name.trim(),
                category_id: categoryId,
                price: String(price),
                duration,
                is_active: isActive,
              })
            }
            className="px-4 py-2 rounded-xl bg-[#40E0D0] hover:bg-[#00897B] text-white transition-colors text-sm font-semibold disabled:opacity-60"
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
