"use client";

import { useMemo, useState } from "react";

import { ServiciosTabBar, type TabId } from "./components/ServiciosTabBar";
import { CategoriasTab } from "./components/CategoriasTab";
import { ServiciosTab } from "./components/ServiciosTab";
import { CategoriaModal } from "./components/CategoriaModal";
import { ServicioModal } from "./components/ServicioModal";

import {
  useCategorias,
  useDeleteCategoria,
  useUpsertCategoria,
  type CategoriaRow,
} from "./hooks/useCategorias";
import { useUpsertServicio, type ServicioRow } from "./hooks/useServicios";

export default function PanelServiciosPage() {
  const [activeTab, setActiveTab] = useState<TabId>("categorias");

  const categoriasQuery = useCategorias();
  const upsertCategoria = useUpsertCategoria();
  const deleteCategoria = useDeleteCategoria();
  const upsertServicio = useUpsertServicio();

  const categorias = categoriasQuery.data ?? [];
  const categoriasError =
    (categoriasQuery.error as { message?: string } | null)?.message ?? null;

  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [categoriaEditing, setCategoriaEditing] = useState<CategoriaRow | null>(
    null,
  );
  const [categoriaDeletingId, setCategoriaDeletingId] = useState<string | null>(
    null,
  );

  const [servicioModalOpen, setServicioModalOpen] = useState(false);
  const [servicioEditing, setServicioEditing] = useState<ServicioRow | null>(null);
  const [servicioDefaultCategoryId, setServicioDefaultCategoryId] = useState<
    string | undefined
  >(undefined);

  const headerTitle = useMemo(() => {
    if (activeTab === "categorias") return "Servicios · Categorías";
    if (activeTab === "servicios") return "Servicios · Servicios";
    if (activeTab === "packs") return "Servicios · Packs";
    return "Servicios · Promos";
  }, [activeTab]);

  const openNewCategoria = () => {
    setCategoriaEditing(null);
    setCategoriaModalOpen(true);
  };

  const openEditCategoria = (cat: CategoriaRow) => {
    setCategoriaEditing(cat);
    setCategoriaModalOpen(true);
  };

  const openNewServicio = (defaults?: Partial<ServicioRow>) => {
    setServicioEditing(null);
    setServicioDefaultCategoryId(defaults?.category_id ?? categorias[0]?.id);
    setServicioModalOpen(true);
  };

  const openEditServicio = (svc: ServicioRow) => {
    setServicioEditing(svc);
    setServicioModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-zinc-500">Panel</div>
        <h1 className="text-2xl font-bold text-white">{headerTitle}</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configura categorías y servicios. Packs y promos van en el próximo sprint.
        </p>
      </div>

      <ServiciosTabBar activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "categorias" && (
        <CategoriasTab
          categorias={categorias}
          isLoading={categoriasQuery.isLoading}
          errorMessage={categoriasError}
          onNew={openNewCategoria}
          onEdit={openEditCategoria}
          onDelete={(id) => {
            setCategoriaDeletingId(id);
            deleteCategoria.mutate(id, {
              onSettled: () => setCategoriaDeletingId(null),
            });
          }}
          deletingId={categoriaDeletingId}
        />
      )}

      {activeTab === "servicios" && (
        <ServiciosTab
          categorias={categorias}
          onNew={(defaults) => openNewServicio(defaults)}
          onEdit={(svc) => openEditServicio(svc)}
        />
      )}

      {(activeTab === "packs" || activeTab === "promos") && (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-8">
          <div className="text-sm font-semibold text-white">Próximamente</div>
          <div className="text-sm text-zinc-400 mt-1">
            Esto se implementa en <span className="text-zinc-200">PR-06B</span>.
          </div>
        </div>
      )}

      <CategoriaModal
        open={categoriaModalOpen}
        initial={categoriaEditing}
        isSaving={upsertCategoria.isPending}
        onClose={() => setCategoriaModalOpen(false)}
        onSave={(payload) => {
          upsertCategoria.mutate(payload, {
            onSuccess: () => setCategoriaModalOpen(false),
          });
        }}
      />

      <ServicioModal
        open={servicioModalOpen}
        categorias={categorias}
        initial={servicioEditing}
        defaultCategoryId={servicioDefaultCategoryId}
        isSaving={upsertServicio.isPending}
        onClose={() => setServicioModalOpen(false)}
        onSave={(payload) => {
          upsertServicio.mutate(payload, {
            onSuccess: () => setServicioModalOpen(false),
          });
        }}
      />
    </div>
  );
}

