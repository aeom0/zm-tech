"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ServiciosTabBar, type TabId } from "./components/ServiciosTabBar";
import { CategoriasTab } from "./components/CategoriasTab";
import { ServiciosTab } from "./components/ServiciosTab";
import { PacksTab } from "./_components/tabs/PacksTab";
import { PromosTab } from "./_components/tabs/PromosTab";
import { CategoriaModal } from "./components/CategoriaModal";
import { ServicioModal } from "./components/ServicioModal";

import {
  useCategorias,
  useDeleteCategoria,
  useUpsertCategoria,
  type CategoriaRow,
} from "@/hooks/servicios/useCategorias";
import {
  useUpsertServicio,
  type ServicioRow,
} from "@/hooks/servicios/useServicios";

export default function PanelServiciosPage() {
  const [activeTab, setActiveTab] = useState<TabId>("categorias");
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [servicioEditing, setServicioEditing] = useState<ServicioRow | null>(
    null,
  );
  const [servicioDefaultCategoryId, setServicioDefaultCategoryId] = useState<
    string | undefined
  >(undefined);

  const TAB_LABELS: Record<TabId, string> = useMemo(
    () => ({
      categorias: "Categorías",
      servicios: "Servicios",
      packs: "Packs",
      promos: "Promos",
    }),
    [],
  );

  const headerTitle = useMemo(() => {
    return `Catálogo de Servicios › ${TAB_LABELS[activeTab]}`;
  }, [activeTab, TAB_LABELS]);

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (!raw) return;
    const next = raw.toLowerCase();
    const allowed: TabId[] = ["categorias", "servicios", "packs", "promos"];
    if (!allowed.includes(next as TabId)) return;
    setActiveTab((prev) => (prev === (next as TabId) ? prev : (next as TabId)));
  }, [searchParams]);

  function handleTabChange(tab: TabId) {
    // Evita que queden modales abiertos al navegar a otra sección.
    if (tab !== "categorias") {
      setCategoriaModalOpen(false);
      setCategoriaEditing(null);
      setCategoriaDeletingId(null);
    }
    if (tab !== "servicios") {
      setServicioModalOpen(false);
      setServicioEditing(null);
      setServicioDefaultCategoryId(undefined);
    }

    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

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
          Configura tu catálogo: categorías, servicios, packs y promos.
        </p>
      </div>

      <ServiciosTabBar activeTab={activeTab} onChange={handleTabChange} />

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

      {activeTab === "packs" && <PacksTab />}
      {activeTab === "promos" && <PromosTab />}

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
