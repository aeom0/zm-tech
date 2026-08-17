// ============================================================
// Catálogo con búsqueda y filtros — datos desde API público
// ============================================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PackageOpen, Search } from "lucide-react";
import { POPULAR_BRANDS } from "@repmax/repmax-schema";
import { createClient } from "@/lib/supabase/client";
import { fetchPublicProducts } from "@/lib/repmax-queries";
import type { ProductPublic } from "@/types/storefront";
import { ProductCard } from "./ProductCard";

const TIPOS_VEHICULO: { value: string; label: string }[] = [
  { value: "", label: "Todos los tipos" },
  { value: "CAR", label: "Carro" },
  { value: "MOTO", label: "Moto" },
  { value: "TRUCK", label: "Camión" },
  { value: "SUV", label: "SUV" },
];

const CONDICIONES: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "NEW", label: "Nuevo" },
  { value: "USED", label: "Usado" },
];

interface ProductCatalogProps {
  storeId: string;
  storeSlug: string;
  initialProducts: ProductPublic[];
  total: number;
  usdBsRate: number;
}


function EsqueletoGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden animate-pulse"
        >
          <div className="h-[160px] bg-[#242424]" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-[#242424] rounded w-3/4" />
            <div className="h-3 bg-[#242424] rounded w-1/2" />
            <div className="h-5 bg-[#242424] rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

const selectClase =
  "min-w-[140px] shrink-0 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]";

export function ProductCatalog({
  storeId,
  storeSlug,
  initialProducts,
  total: totalInicial,
  usdBsRate,
}: ProductCatalogProps) {
  const [marca, setMarca] = useState("");
  const [condicion, setCondicion] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const limite = 20;

  const [productos, setProductos] = useState<ProductPublic[]>(initialProducts);
  const [total, setTotal] = useState(totalInicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Evita re-fetch al montar: ya tenemos datos del Server Component */
  const omitirPrimeraCarga = useRef(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagina));
      params.set("limit", String(limite));
      if (marca) params.set("brand", marca);
      if (condicion) params.set("condition", condicion);
      if (tipoVehiculo) params.set("vehicleType", tipoVehiculo);
      if (busqueda.trim()) params.set("q", busqueda.trim());

      const client = createClient();
      const data = await fetchPublicProducts(client, storeId, usdBsRate, params);
      setProductos(data.products);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
      setProductos([]);
      setTotal(0);
    } finally {
      setCargando(false);
    }
  }, [storeId, usdBsRate, marca, condicion, tipoVehiculo, busqueda, pagina]);

  // Refetch solo tras la primera pintura (datos iniciales vienen del servidor)
  useEffect(() => {
    if (omitirPrimeraCarga.current) {
      omitirPrimeraCarga.current = false;
      return;
    }
    void cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-4">
      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#607D8B]"
          aria-hidden
        />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por nombre, marca, modelo..."
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-3 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder:text-[#616161] focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
          autoComplete="off"
        />
      </div>

      {/* Filtros — scroll horizontal en móvil */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <select
          className={selectClase}
          value={marca}
          onChange={(e) => {
            setMarca(e.target.value);
            setPagina(1);
          }}
          aria-label="Marca"
        >
          <option value="">Todas las marcas</option>
          {POPULAR_BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className={selectClase}
          value={condicion}
          onChange={(e) => {
            setCondicion(e.target.value);
            setPagina(1);
          }}
          aria-label="Condición"
        >
          {CONDICIONES.map((c) => (
            <option key={c.value || "all"} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className={selectClase}
          value={tipoVehiculo}
          onChange={(e) => {
            setTipoVehiculo(e.target.value);
            setPagina(1);
          }}
          aria-label="Tipo de vehículo"
        >
          {TIPOS_VEHICULO.map((t) => (
            <option key={t.value || "all-v"} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mb-4 text-center text-sm text-[#F44336]" role="alert">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <EsqueletoGrid />
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageOpen className="mb-4 h-14 w-14 text-[#607D8B]" aria-hidden />
          <p className="text-lg font-semibold text-[#F5F5F5]">Sin resultados</p>
          <p className="mt-1 text-sm text-[#9E9E9E]">Probá otro filtro o búsqueda.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {productos.map((p) => (
              <ProductCard key={p.id} product={p} usdBsRate={usdBsRate} storeSlug={storeSlug} />
            ))}
          </div>
          {totalPaginas > 1 ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-[#F5F5F5] disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-[#9E9E9E]">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
                className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-[#F5F5F5] disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
