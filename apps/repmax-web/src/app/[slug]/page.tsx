// ============================================================
// Storefront público por tienda — /[slug]
// ============================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import type { ProductPublic, StorePublic } from "@/types/storefront";

interface Props {
  params: Promise<{ slug: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function obtenerTienda(slug: string): Promise<StorePublic | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/${encodeURIComponent(slug)}/store`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as StorePublic;
  } catch {
    return null;
  }
}

interface RespuestaProductos {
  products: ProductPublic[];
  total: number;
  page: number;
  limit: number;
}

async function obtenerProductosIniciales(slug: string): Promise<{
  products: ProductPublic[];
  total: number;
}> {
  try {
    const res = await fetch(
      `${API_BASE}/api/public/${encodeURIComponent(slug)}/products?page=1&limit=20`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return { products: [], total: 0 };
    }
    const data = (await res.json()) as RespuestaProductos;
    return { products: data.products, total: data.total };
  } catch {
    return { products: [], total: 0 };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tienda = await obtenerTienda(slug);

  if (!tienda) {
    return {
      title: "Tienda no encontrada — RepMAX",
      description: "Catálogo de repuestos en RepMAX Business Suite.",
    };
  }

  const descripcion = tienda.city
    ? `Repuestos en ${tienda.city}. ${tienda.name} en RepMAX.`
    : `Catálogo de ${tienda.name} en RepMAX.`;

  return {
    title: `${tienda.name} — RepMAX`,
    description: descripcion,
    openGraph: {
      title: `${tienda.name} — RepMAX`,
      description: tienda.city ? `${tienda.name} · ${tienda.city}` : descripcion,
      type: "website",
    },
  };
}

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params;

  const tienda = await obtenerTienda(slug);
  if (!tienda) {
    notFound();
  }

  const { products, total } = await obtenerProductosIniciales(slug);

  return <StorefrontView store={tienda} initialProducts={products} total={total} />;
}
