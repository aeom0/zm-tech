"use client";

import { Package, Plus } from "lucide-react";
import { useState } from "react";

import { usePacks } from "@/hooks/servicios/usePacks";
import type { Pack } from "../../_services/packsService";
import { PackCard } from "../packs/PackCard";
import { PackFormModal } from "../packs/PackFormModal";

export function PacksTab() {
  const { data: packs = [], isLoading } = usePacks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pack | null>(null);

  function handleEdit(pack: Pack) {
    setEditing(pack);
    setModalOpen(true);
  }

  function handleClose() {
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          {packs.length} pack{packs.length !== 1 ? "s" : ""} registrado
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
          Nuevo pack
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-white/30">
          Cargando...
        </div>
      ) : packs.length === 0 ? (
        <div className="py-12 text-center text-white/30">
          <Package className="mx-auto mb-2 h-10 w-10 opacity-40" />
          <p className="text-sm">Todavía no hay packs</p>
          <p className="mt-1 text-xs">Arma tu primer combo de servicios</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} onEdit={handleEdit} />
          ))}
        </div>
      )}

      <PackFormModal open={modalOpen} pack={editing} onClose={handleClose} />
    </div>
  );
}
