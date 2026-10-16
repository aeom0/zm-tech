'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchOnboardingStatus, queryKeys } from '@geemastudio/data'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

/** Estado del alta del tenant (correo confirmado, trial). */
export function useOnboardingStatus() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? null
  return useQuery({
    queryKey: queryKeys.onboarding.status(tenantId),
    queryFn: () => {
      if (!supabase || !tenantId) throw new Error('No se pudo resolver el negocio')
      return fetchOnboardingStatus(supabase, tenantId)
    },
    enabled: Boolean(supabase && tenantId),
  })
}
