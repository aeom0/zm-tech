import { useQuery } from '@tanstack/react-query'
import { fetchPromoSegment, queryKeys } from '@geemastudio/data'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'
import type { ClienteSegmento } from '../types'

export function useClientesSegmento(categoryName: string | null, inactiveOnly = false) {
  const { config } = useTenant()
  const { tenantId } = useProfileTenantId()
  const timeZone = config.locale.timezone

  return useQuery<ClienteSegmento[]>({
    queryKey: queryKeys.promos.segment(tenantId ?? null, timeZone, categoryName, inactiveOnly),
    staleTime: 1000 * 60 * 5,
    enabled: !!tenantId,
    queryFn: () =>
      fetchPromoSegment(supabase, { tenantId: tenantId!, timeZone, categoryName, inactiveOnly }),
  })
}
