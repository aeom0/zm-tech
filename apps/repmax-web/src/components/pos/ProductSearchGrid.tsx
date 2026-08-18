// ============================================================
// POS — grid de búsqueda de productos
// ============================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchProducts } from "@/lib/repmax-queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductoWeb } from "@/types/dashboard";

interface ProductSearchGridProps {
  storeId: string;
  usdBsRate: number;
  refreshKey?: number;
  onAdd: (product: ProductoWeb) => void;
}

export function ProductSearchGrid({
  storeId,
  usdBsRate,
  refreshKey = 0,
  onAdd,
}: ProductSearchGridProps) {
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [productos, setProductos] = useState<ProductoWeb[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    function limpiarBusqueda() {
      setBusqueda("");
      setBusquedaDebounced("");
    }
    window.addEventListener("repmax-barcode-clear", limpiarBusqueda);
    return () => window.removeEventListener("repmax-barcode-clear", limpiarBusqueda);
  }, []);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", "1");
    p.set("limit", "40");
    if (busquedaDebounced) p.set("q", busquedaDebounced);
    return p;
  }, [busquedaDebounced]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const client = createClient();
    fetchProducts(client, url, usdBsRate)
      .then((res) => {
        if (!cancelled) setProductos(res.products.filter((p) => p.isActive));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar productos");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, usdBsRate, storeId, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#616161]" />
        <Input
          placeholder="Buscar repuesto o código…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border-[#2A2A2A] bg-[#242424] pl-9 text-[#F5F5F5] placeholder:text-[#616161] focus-visible:ring-[#FF6B00]"
          data-barcode-input="true"
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-[#F44336]/40 bg-[#1A1A1A] p-4 text-sm text-[#F44336]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {productos.map((p) => (
            <Card key={p.id} className="flex flex-col border-[#2A2A2A] bg-[#1A1A1A] p-3">
              {p.photos?.[0] ? (
                <Image
                  src={p.photos[0]}
                  alt=""
                  width={120}
                  height={120}
                  className="h-24 w-full rounded object-cover bg-[#242424]"
                  unoptimized
                />
              ) : (
                <div className="h-24 w-full rounded bg-[#242424]" />
              )}
              <div className="mt-2 flex-1 space-y-1">
                <p className="line-clamp-2 text-sm font-medium text-[#F5F5F5]">{p.title}</p>
                <p className="text-xs text-[#9E9E9E]">
                  {p.brand} {p.model}
                </p>
                <p className="text-sm font-semibold text-[#FF6B00]">${p.priceUsd.toFixed(2)}</p>
                <p
                  className={
                    p.stock <= 0
                      ? "text-xs font-semibold text-[#F44336]"
                      : p.stock <= p.minStock
                        ? "text-xs font-semibold text-[#FFC107]"
                        : "text-xs text-[#616161]"
                  }
                >
                  Stock: {p.stock}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={p.stock <= 0}
                onClick={() => onAdd(p)}
                className="mt-2 w-full bg-[#FF6B00] font-semibold text-[#0D0D0D] hover:bg-[#FF8533] disabled:bg-[#242424] disabled:text-[#616161]"
              >
                {p.stock <= 0 ? "Sin stock" : "Agregar"}
              </Button>
            </Card>
          ))}
          {productos.length === 0 ? (
            <p className="col-span-full p-8 text-center text-sm text-[#9E9E9E]">
              No hay productos con esos filtros.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
