// ============================================================
// 404 — slug de tienda inexistente o inactivo
// ============================================================

import Link from 'next/link'
import { BrandLogo } from '@/components/brand/BrandLogo'

export default function StorefrontNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0D] px-6 text-center">
      <BrandLogo variant="wordmark" height={36} className="mx-auto mb-4" />
      <h1 className="mb-3 text-2xl font-bold text-[#F5F5F5] md:text-3xl">Tienda no encontrada</h1>
      <p className="mb-8 max-w-md text-base text-[#9E9E9E]">
        El enlace puede estar desactivado o no existe.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-lg bg-[#FF6B00] px-6 py-3 text-sm font-semibold text-[#0D0D0D] transition-opacity hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
