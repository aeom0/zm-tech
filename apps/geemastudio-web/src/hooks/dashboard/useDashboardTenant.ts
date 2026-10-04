'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface DashboardTenantRow {
  business_name: string
  currency_code: string | null
  timezone: string
  client_terminology: string
  appointment_terminology: string
}

export function useDashboardTenant(enabled = true) {
  return useQuery({
    queryKey: ['dashboard_tenant_settings'],
    enabled: enabled && !!supabase,
    queryFn: async (): Promise<DashboardTenantRow | null> => {
      if (!supabase) return null
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const cols =
        'business_name, currency_code, timezone, client_terminology, appointment_terminology'
      let { data, error } = await supabase
        .from('tenant_settings')
        .select(cols)
        .eq('id', user.id)
        .maybeSingle()
      // Staff/owners sin fila propia: resolver el tenant por profiles.tenant_id
      // (sin esto el timezone caía al default y el panel mostraba hora de Caracas).
      if (!data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .maybeSingle()
        const slug = profile?.tenant_id as string | null | undefined
        if (slug) {
          const bySlug = await supabase
            .from('tenant_settings')
            .select(cols)
            .eq('tenant_slug', slug)
            .maybeSingle()
          data = bySlug.data
          error = bySlug.error
        }
      }
      if (error) throw new Error(error.message)
      if (!data) return null
      return {
        business_name: data.business_name as string,
        currency_code: (data.currency_code as string | null) ?? null,
        timezone: (data.timezone as string | null) ?? 'America/Caracas',
        client_terminology: (data.client_terminology as string | null)?.trim() || 'cliente',
        appointment_terminology:
          (data.appointment_terminology as string | null)?.trim() || 'cita',
      }
    },
    staleTime: 60_000,
  })
}
