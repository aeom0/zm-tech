"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { CategoriaRow } from "../hooks/useCategorias";
import { supabase } from "@/lib/supabase";

export function CategoriasTab({
  categorias,
  isLoading,
  errorMessage,
  onNew,
  onEdit,
  onDelete,
  deletingId,
}: {
  categorias: CategoriaRow[];
  isLoading: boolean;
  errorMessage: string | null;
  onNew: () => void;
  onEdit: (cat: CategoriaRow) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const confirmDelete = async (cat: CategoriaRow) => {
    if (!supabase) {
      alert("Supabase no está configurado");
      return;
    }

    setCheckingId(cat.id);
    try {
      const { count, error } = await supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("category_id", cat.id);

      if (error) {
        const ok = window.confirm(
          `¿Eliminar la categoría "${cat.name}"? (No pude validar servicios asociados)`,
        );
        if (ok) onDelete(cat.id);
        return;
      }

      if ((count ?? 0) > 0) {
        const ok = window.confirm(
          `Esta categoría tiene ${count} servicio(s). Si la borras, los servicios quedarán sin categoría o fallará por restricciones.\n\n¿Seguro que quieres eliminar "${cat.name}"?`,
        );
        if (ok) onDelete(cat.id);
        return;
      }

      const ok = window.confirm(`¿Eliminar la categoría "${cat.name}"?`);
      if (ok) onDelete(cat.id);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Categorías</h2>
          <p className="text-sm text-zinc-400">
            Agrupa servicios para que el filtro quede ordenadito.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E91E8C] hover:bg-[#C2185B] text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/30 text-red-300 px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-[92px] rounded-2xl border border-white/[0.08] bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      ) : categorias.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-8 text-center">
          <div className="text-sm text-zinc-300 font-semibold">
            Aún no tienes categorías
          </div>
          <div className="text-sm text-zinc-500 mt-1">
            Crea la primera para empezar a cargar servicios.
          </div>
          <button
            type="button"
            onClick={onNew}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E91E8C] hover:bg-[#C2185B] text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva categoría
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categorias.map((c) => {
            const busy =
              deletingId === c.id || checkingId === c.id || deletingId !== null;
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-6 h-6 rounded-lg border border-white/[0.10] flex-shrink-0"
                      style={{ backgroundColor: c.color }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {c.icon ? `icon: ${c.icon}` : "sin icono"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(c)}
                      className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] inline-flex items-center justify-center text-zinc-200 hover:bg-white/[0.06] transition-colors"
                      aria-label={`Editar ${c.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void confirmDelete(c)}
                      className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 inline-flex items-center justify-center text-red-300 hover:bg-red-500/15 transition-colors disabled:opacity-60"
                      aria-label={`Eliminar ${c.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

