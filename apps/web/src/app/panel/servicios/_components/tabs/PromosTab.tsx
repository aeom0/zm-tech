"use client";

import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { usePromos } from "../../_hooks/usePromos";
import type { Promotion } from "../../_services/promosService";
import { PromoCard } from "../promos/PromoCard";
import { PromoFormModal } from "../promos/PromoFormModal";

export function PromosTab() {
  const { data: promos = [], isLoading } = usePromos();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  function handleEdit(promo: Promotion) {
    setEditing(promo);
    setModalOpen(true);
  }

  function handleClose() {
    setModalOpen(false);
    setEditing(null);
  }

  const active = promos.filter((p) => p.is_active);
  const inactive = promos.filter((p) => !p.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          {active.length} activa{active.length !== 1 ? "s" : ""} ·{" "}
          {inactive.length} inactiva{inactive.length !== 1 ? "s" : ""}
        </p>

        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#E91E8C] px-3 py-1.5 text-sm text-white transition-colors hover:bg-[#C2185B]"
        >
          <Plus className="h-4 w-4" />
          Nueva promo
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-white/30">
          Cargando...
        </div>
      ) : promos.length === 0 ? (
        <div className="py-12 text-center text-white/30">
          <Sparkles className="mx-auto mb-2 h-10 w-10 opacity-40" />
          <p className="text-sm">Todavia no hay promos</p>
          <p className="mt-1 text-xs">Monta ofertas especiales</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map((promo) => (
            <PromoCard key={promo.id} promo={promo} onEdit={handleEdit} />
          ))}
        </div>
      )}

      <PromoFormModal open={modalOpen} promo={editing} onClose={handleClose} />
    </div>
  );
}
