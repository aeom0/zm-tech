// ============================================================
// Página pública de producto — /[slug]/p/[id]
// ============================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/storefront/ProductDetailView";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { fetchPublicProduct, fetchPublicStore } from "@/lib/repmax-queries";

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const supabase = await createClient();
  const tienda = await fetchPublicStore(supabase, slug);
  if (!tienda) {
    return { title: "Producto no encontrado — RepMAX" };
  }

  const producto = await fetchPublicProduct(supabase, tienda.id, id, tienda.usdBsRate);
  if (!producto) {
    return { title: "Producto no encontrado — RepMAX" };
  }

  const descripcion = producto.partNumber
    ? `${producto.title} · ref ${producto.partNumber} — ${tienda.name}`
    : `${producto.title} — ${tienda.name}`;

  return {
    title: `${producto.title} — ${tienda.name}`,
    description: descripcion,
    openGraph: {
      title: producto.title,
      description: descripcion,
      type: "website",
      images: producto.photos?.[0] ? [{ url: producto.photos[0] }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const tienda = await fetchPublicStore(supabase, slug);
  if (!tienda) notFound();

  const producto = await fetchPublicProduct(supabase, tienda.id, id, tienda.usdBsRate);
  if (!producto) notFound();

  return (
    <ProductDetailView
      store={tienda}
      product={producto}
      siteUrl={getSiteUrl()}
    />
  );
}
