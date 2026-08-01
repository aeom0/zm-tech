// ============================================================
// Cabecera del storefront — datos de la tienda (Server Component)
// ============================================================

import Link from "next/link";

export interface StorefrontHeaderStore {
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  plan: "basic" | "pro" | "enterprise";
}

interface StorefrontHeaderProps {
  store: StorefrontHeaderStore;
}

/** Solo dígitos para wa.me */
function telefonoLimpio(phone: string): string {
  return phone.replace(/\D/g, "");
}

function inicialNombre(nombre: string): string {
  const t = nombre.trim();
  return t.length > 0 ? t.charAt(0).toUpperCase() : "?";
}

export function StorefrontHeader({ store }: StorefrontHeaderProps) {
  const waHref = store.phone
    ? `https://wa.me/${telefonoLimpio(store.phone)}?text=${encodeURIComponent(
        "Hola, vi tu catálogo en RepMAX",
      )}`
    : null;

  return (
    <header className="border-b border-[#2A2A2A] bg-[#1A1A1A]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6B00] text-lg font-bold text-[#0D0D0D]"
            aria-hidden
          >
            {inicialNombre(store.name)}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="truncate text-xl font-bold text-[#F5F5F5]">{store.name}</h1>
            {store.city ? (
              <p className="truncate text-sm text-[#9E9E9E]">{store.city}</p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full shrink-0 items-center justify-center gap-3 sm:w-auto sm:justify-end">
          {store.plan === "pro" ? (
            <span className="rounded-md bg-[#FF6B00]/10 px-2 py-1 text-xs font-semibold text-[#FF6B00]">
              Pro
            </span>
          ) : null}
          {store.plan === "enterprise" ? (
            <span className="rounded-md bg-[#2196F3]/10 px-2 py-1 text-xs font-semibold text-[#2196F3]">
              Enterprise
            </span>
          ) : null}
          {waHref ? (
            <Link
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <svg
                className="h-5 w-5 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contactar
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
