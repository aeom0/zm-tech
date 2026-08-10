// ============================================================
// 404 — slug de tienda inexistente o inactivo
// ============================================================

import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function StorefrontNotFound() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-6 text-center">
      <BrandLogo variant="wordmark" height={36} className="mb-4 mx-auto" />
      <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5F5] mb-3">
        Tienda no encontrada
      </h1>
      <p className="text-[#9E9E9E] text-base max-w-md mb-8">
        El enlace puede estar desactivado o no existe.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-lg bg-[#FF6B00] px-6 py-3 text-sm font-semibold text-[#0D0D0D] transition-opacity hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
