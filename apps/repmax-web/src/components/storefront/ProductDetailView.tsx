// ============================================================
// Detalle de producto — vitrina pública
// ============================================================

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Wrench } from "lucide-react";
import type { ProductPublic, StorePublic } from "@/types/storefront";
import {
  enlaceWhatsApp,
  mensajeWhatsAppProducto,
  urlProductoVitrina,
} from "@/lib/storefront-url";

interface ProductDetailViewProps {
  store: StorePublic;
  product: ProductPublic;
  siteUrl: string;
}

function formatearUsd(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

function formatearBs(valor: number): string {
  return `Bs ${valor.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProductDetailView({ store, product, siteUrl }: ProductDetailViewProps) {
  const fotos = product.photos?.filter(Boolean) ?? [];
  const precioBs = product.priceBs ?? product.priceUsd * store.usdBsRate;
  const productUrl = urlProductoVitrina(siteUrl, store.slug, product.id);

  const waHref = store.phone
    ? enlaceWhatsApp(
        store.phone,
        mensajeWhatsAppProducto({
          storeName: store.name,
          productTitle: product.title,
          partNumber: product.partNumber,
          productUrl,
        }),
      )
    : null;

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <Link
          href={`/${store.slug}`}
          className="inline-flex items-center gap-2 text-sm text-[#9E9E9E] transition-colors hover:text-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al catálogo
        </Link>
      </div>

      <article className="mx-auto max-w-3xl px-4 pb-32">
        <div className="overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
          {fotos.length > 0 ? (
            <div className="grid gap-2 p-2 sm:grid-cols-2">
              {fotos.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className={`relative bg-[#242424] ${i === 0 ? "sm:col-span-2 aspect-[4/3]" : "aspect-square"}`}
                >
                  <Image
                    src={src}
                    alt={i === 0 ? product.title : `${product.title} foto ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 672px"
                    unoptimized
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center bg-[#242424]">
              <Wrench className="h-14 w-14 text-[#607D8B]" aria-hidden />
            </div>
          )}

          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap items-start gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  product.condition === "NEW"
                    ? "bg-[#4CAF50]/20 text-[#4CAF50]"
                    : "bg-[#9E9E9E]/20 text-[#9E9E9E]"
                }`}
              >
                {product.condition === "NEW" ? "NUEVO" : "USADO"}
              </span>
              {product.stock <= 3 ? (
                <span className="rounded bg-[#FFC107]/15 px-2 py-0.5 text-xs font-medium text-[#FFC107]">
                  Últimas {product.stock} unidades
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-2xl font-bold text-[#F5F5F5]">{product.title}</h1>
            <p className="mt-1 text-sm text-[#9E9E9E]">
              {product.brand} · {product.model}
              {product.yearFrom != null
                ? ` · ${product.yearFrom}${product.yearTo != null ? `–${product.yearTo}` : ""}`
                : ""}
            </p>
            {product.partNumber ? (
              <p className="mt-2 text-sm font-medium text-[#607D8B]">
                N. parte: {product.partNumber}
              </p>
            ) : null}

            <div className="mt-4">
              <p className="text-2xl font-bold text-[#FF6B00]">{formatearUsd(product.priceUsd)}</p>
              <p className="text-sm text-[#9E9E9E]">{formatearBs(precioBs)}</p>
            </div>

            {product.description ? (
              <div className="mt-6 border-t border-[#2A2A2A] pt-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">
                  Descripción
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#F5F5F5] whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            Pedir por WhatsApp
          </a>
        ) : null}
      </article>
    </div>
  );
}
