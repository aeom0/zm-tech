'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

async function resolveTenantId(userId: string | null): Promise<string | null> {
  if (!supabase || !userId) return null
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null
}

export function useTenantId() {
  const { userId } = useAuth()

  const query = useQuery({
    queryKey: ['profile_tenant_id', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: () => resolveTenantId(userId),
  })

  return {
    tenantId: query.data ?? null,
    isLoading: query.isLoading,
  }
}
