// ============================================================
// Storefront público por tienda — /[slug]
// ============================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { createClient } from "@/lib/supabase/server";
import { urlVitrinaTienda } from "@/lib/site-url";
import { leerSlugHostVitrina } from "@/lib/vitrina-headers";
import {
  fetchPublicProducts,
  fetchPublicStore,
} from "@/lib/repmax-queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const tienda = await fetchPublicStore(supabase, slug);

  if (!tienda) {
    return {
      title: "Tienda no encontrada — RepMAX",
      description: "Catálogo de repuestos en RepMAX Business Suite.",
    };
  }

  const descripcion = tienda.city
    ? `Repuestos en ${tienda.city}. ${tienda.name} en RepMAX.`
    : `Catálogo de ${tienda.name} en RepMAX.`;
  const canonical = urlVitrinaTienda(slug);

  return {
    title: `${tienda.name} — RepMAX`,
    description: descripcion,
    alternates: { canonical },
    openGraph: {
      title: `${tienda.name} — RepMAX`,
      description: tienda.city ? `${tienda.name} · ${tienda.city}` : descripcion,
      type: "website",
      url: canonical,
    },
  };
}

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const hostSlug = await leerSlugHostVitrina();

  const tienda = await fetchPublicStore(supabase, slug);
  if (!tienda) {
    notFound();
  }

  const paramsProductos = new URLSearchParams({ page: "1", limit: "20" });
  const { products, total } = await fetchPublicProducts(
    supabase,
    tienda.id,
    tienda.usdBsRate,
    paramsProductos,
  );

  return (
    <StorefrontView
      store={tienda}
      initialProducts={products}
      total={total}
      hostSlug={hostSlug}
    />
  );
}
