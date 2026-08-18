'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface DashboardTenantRow {
  business_name: string
  currency_code: string | null
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
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('business_name, currency_code')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return null
      return {
        business_name: data.business_name as string,
        currency_code: (data.currency_code as string | null) ?? null,
      }
    },
    staleTime: 60_000,
  })
}
