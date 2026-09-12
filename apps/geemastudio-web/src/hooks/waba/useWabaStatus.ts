'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { fetchTenantSettingsForSession } from '@/hooks/configuracion/tenantSettingsService'

export interface WabaStatus {
  tenantSettingsId: string
  tenantSlug: string | null
  businessName: string
  featuresWhatsapp: boolean
  featuresWaba: boolean
  phoneNumberId: string | null
  hasAccessToken: boolean
}

/** Extiende lectura de tenant_settings con columnas WABA (pueden faltar en Drizzle). */
export function useWabaStatus() {
  return useQuery({
    queryKey: ['web_waba_status'],
    enabled: !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<WabaStatus | null> => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const base = await fetchTenantSettingsForSession()
      if (!base) return null

      const { data, error } = await supabase
        .from('tenant_settings')
        .select(
          'id, tenant_slug, business_name, features_whatsapp, features_waba, waba_phone_number_id, waba_access_token'
        )
        .eq('id', base.id)
        .maybeSingle()

      if (error) {
        // Columnas WABA pueden no existir en algún entorno: devolver base
        return {
          tenantSettingsId: base.id,
          tenantSlug: null,
          businessName: base.business_name,
          featuresWhatsapp: base.features_whatsapp,
          featuresWaba: false,
          phoneNumberId: null,
          hasAccessToken: false,
        }
      }

      const row = data as Record<string, unknown> | null
      if (!row) return null

      return {
        tenantSettingsId: String(row.id),
        tenantSlug: (row.tenant_slug as string | null) ?? null,
        businessName: String(row.business_name ?? base.business_name),
        featuresWhatsapp: Boolean(row.features_whatsapp ?? base.features_whatsapp),
        featuresWaba: Boolean(row.features_waba),
        phoneNumberId: (row.waba_phone_number_id as string | null) ?? null,
        hasAccessToken: Boolean(
          typeof row.waba_access_token === 'string' && row.waba_access_token.length > 0
        ),
      }
    },
  })
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

/**
 * `wa_messages` / `waba_config` usan tenant_id = slug (texto), no UUID.
 * Orden: JWT claim → tenant_settings.tenant_slug → profiles.tenant_id si no es UUID.
 */
export async function resolveTenantSlugForWrites(): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { tenant_id?: string }
      const claim = typeof payload.tenant_id === 'string' ? payload.tenant_id.trim() : ''
      if (claim && !looksLikeUuid(claim)) return claim
    } catch {
      /* fallthrough */
    }
  }

  const statusBase = await fetchTenantSettingsForSession()
  if (statusBase) {
    const { data } = await supabase
      .from('tenant_settings')
      .select('tenant_slug')
      .eq('id', statusBase.id)
      .maybeSingle()
    const slug = (data as { tenant_slug?: string | null } | null)?.tenant_slug?.trim()
    if (slug) return slug
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sin sesión')
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()
  const fromProfile = (profile?.tenant_id as string | null | undefined)?.trim()
  if (fromProfile && !looksLikeUuid(fromProfile)) return fromProfile

  throw new Error('No se pudo resolver tenant_slug para WABA')
}
