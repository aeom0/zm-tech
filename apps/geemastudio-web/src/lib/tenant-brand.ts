// Resuelve marca del tenant (colores, nombre, logo) desde tenant_settings.
// Compartido entre panel/layout.tsx (theming del shell) y manifest.ts (PWA).

import type { createServerSupabaseClient } from './supabase-server'

export type TenantBrand = {
  primary: string | null
  accent: string | null
  businessName: string | null
  logoUrl: string | null
  tenantSlug: string | null
}

const BRAND_SELECT = 'primary_color, accent_color, business_name, logo_url, tenant_slug'

function toBrand(row: {
  primary_color?: string | null
  accent_color?: string | null
  business_name?: string | null
  logo_url?: string | null
  tenant_slug?: string | null
} | null): TenantBrand {
  return {
    primary: row?.primary_color ?? null,
    accent: row?.accent_color ?? null,
    businessName: row?.business_name ?? null,
    logoUrl: row?.logo_url || null,
    tenantSlug: row?.tenant_slug || null,
  }
}

export async function fetchTenantBrandBySlug(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  tenantSlug: string
): Promise<TenantBrand> {
  // Vista pública: el manifest y los iconos PWA se piden sin sesión (anon) y
  // tenant_settings solo es legible por dev/owner.
  const bySlug = await supabase
    .from('tenant_brand_public')
    .select(BRAND_SELECT)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  return toBrand(bySlug.data)
}

export async function fetchTenantBrandForUser(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
): Promise<TenantBrand> {
  const byId = await supabase
    .from('tenant_settings')
    .select(BRAND_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (byId.data) return toBrand(byId.data)

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()

  const tenantSlug = profile?.tenant_id as string | null | undefined
  if (!tenantSlug) return toBrand(null)

  const bySlug = await supabase
    .from('tenant_settings')
    .select(BRAND_SELECT)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  return toBrand(bySlug.data)
}

/** Hash corto de logo + color: cambia la URL del ícono PWA cuando el tenant cambia su marca (evita caché vieja). */
function brandVersion(brand: Pick<TenantBrand, 'logoUrl' | 'primary'>): string {
  const input = `v2|${brand.logoUrl ?? ''}|${brand.primary ?? ''}`
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0
  return h.toString(36)
}

export function pwaIconUrl(
  brand: Pick<TenantBrand, 'logoUrl' | 'primary'> & { tenantSlug: string },
  size: number,
  maskable = false
): string {
  const q = `tenant=${encodeURIComponent(brand.tenantSlug)}&size=${size}${maskable ? '&maskable=1' : ''}`
  return `/api/pwa/icon?${q}&v=${brandVersion(brand)}`
}
