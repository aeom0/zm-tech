// ============================================================
// Tarjeta de producto — catálogo público (Server Component)
// ============================================================

import Image from 'next/image'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import type { ProductPublic } from '@/types/storefront'
import { pathProductoVitrina } from '@/lib/vitrina-host'

interface ProductCardProps {
  product: ProductPublic
  usdBsRate: number
  storeSlug: string
  hostSlug: string | null
}

function formatearUsd(valor: number): string {
  return `$${valor.toFixed(2)}`
}

function formatearBs(valor: number): string {
  return `Bs ${valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ProductCard({ product, usdBsRate, storeSlug, hostSlug }: ProductCardProps) {
  const foto = product.photos?.[0] ?? null
  const precioBsCalculado = product.priceUsd * usdBsRate

  return (
    <Link
      href={pathProductoVitrina(storeSlug, product.id, hostSlug)}
      className="group flex flex-col overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] transition-colors duration-200 hover:border-[#FF6B00]"
    >
      <div className="relative h-[160px] w-full bg-[#242424]">
        {foto ? (
          <Image
            src={foto}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Wrench className="h-10 w-10 text-[#607D8B]" aria-hidden />
          </div>
        )}
        <div
          className={`absolute right-2 top-2 rounded px-2 py-0.5 text-xs font-semibold ${
            product.condition === 'NEW'
              ? 'bg-[#4CAF50]/20 text-[#4CAF50]'
              : 'bg-[#9E9E9E]/20 text-[#9E9E9E]'
          }`}
        >
          {product.condition === 'NEW' ? 'NUEVO' : 'USADO'}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h2 className="line-clamp-2 text-sm font-bold text-[#F5F5F5]">{product.title}</h2>
        <p className="mt-1 text-xs text-[#9E9E9E]">
          {product.brand} · {product.model}
        </p>
        {product.yearFrom != null ? (
          <p className="mt-0.5 text-xs text-[#607D8B]">
            año {product.yearFrom}
            {product.yearTo != null ? `–${product.yearTo}` : ''}
          </p>
        ) : null}
        <p className="mt-2 text-lg font-bold text-[#FF6B00]">{formatearUsd(product.priceUsd)}</p>
        <p className="text-xs text-[#9E9E9E]">{formatearBs(precioBsCalculado)}</p>
        {product.stock <= 3 ? (
          <p className="mt-2 text-xs font-medium text-[#FFC107]">
            Últimas {product.stock} unidades
          </p>
        ) : null}
        {product.partNumber ? (
          <p className="mt-auto pt-2 text-xs text-[#616161]">Ref: {product.partNumber}</p>
        ) : null}
      </div>
    </Link>
  )
}
