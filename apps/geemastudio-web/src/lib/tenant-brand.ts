// Resuelve marca del tenant (colores, nombre, logo) desde tenant_settings.
// Compartido entre panel/layout.tsx (theming del shell) y manifest.ts (PWA).

import type { createServerSupabaseClient } from './supabase-server'

export type TenantBrand = {
  primary: string | null
  accent: string | null
  businessName: string | null
  logoUrl: string | null
}

const BRAND_SELECT = 'primary_color, accent_color, business_name, logo_url'

function toBrand(row: {
  primary_color?: string | null
  accent_color?: string | null
  business_name?: string | null
  logo_url?: string | null
} | null): TenantBrand {
  return {
    primary: row?.primary_color ?? null,
    accent: row?.accent_color ?? null,
    businessName: row?.business_name ?? null,
    logoUrl: row?.logo_url || null,
  }
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
