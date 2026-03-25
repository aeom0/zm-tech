"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import type { CategoriaRow } from "@/hooks/servicios/useCategorias";

export function CategoriaModal({
  open,
  initial,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: CategoriaRow | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    name: string;
    color: string;
    icon?: string | null;
  }) => void;
}) {
  const title = initial ? "Editar categoría" : "Nueva categoría";

  const [name, setName] = useState("");
  const [color, setColor] = useState("#E91E8C");
  const [icon, setIcon] = useState("");

  const canSubmit = useMemo(
    () => name.trim().length > 0 && !!color,
    [name, color],
  );

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setColor(initial?.color ?? "#E91E8C");
    setIcon(initial?.icon ?? "");
  }, [open, initial]);

  if (!open) return null;

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
              Orden y nombre se reflejan en el selector de servicios.
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
              className="w-full px-4 py-2.5 rounded-xl border border-white/[0.10] bg-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent"
              placeholder="Ej. Uñas"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  type="color"
                  className="h-11 w-14 rounded-xl border border-white/[0.10] bg-zinc-800 p-1"
                />
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.10] bg-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent"
                  placeholder="#E91E8C"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Icono (opcional)
              </label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.10] bg-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent"
                placeholder="Feather: scissors"
              />
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
                color: color.trim(),
                icon: icon.trim() ? icon.trim() : null,
              })
            }
            className="px-4 py-2 rounded-xl bg-[#E91E8C] hover:bg-[#C2185B] text-white transition-colors text-sm font-semibold disabled:opacity-60"
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
