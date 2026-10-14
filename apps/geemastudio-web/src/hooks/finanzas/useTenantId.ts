'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

// Resuelve el tenant desde la sesión de Supabase, sin depender de AuthContext,
// para poder usarse en cualquier hook aunque el perfil aún no haya cargado.
async function resolveTenantId(): Promise<string | null> {
  if (!supabase) return null
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return null
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null
}

export function useTenantId() {
  const query = useQuery({
    queryKey: ['profile_tenant_id'],
    staleTime: 5 * 60_000,
    queryFn: resolveTenantId,
  })

  return {
    tenantId: query.data ?? null,
    isLoading: query.isLoading,
  }
}
