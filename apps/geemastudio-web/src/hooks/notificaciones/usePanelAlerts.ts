'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchUnreviewedReferences, queryKeys } from '@geemastudio/data'
import { zonaIANASegura } from '@zmtech/tenant-config'

import { useAuth } from '@/contexts/AuthContext'
import { useUnassignedCount } from '@/hooks/asignar/useAssignWindow'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { usePendingVerificationsCount } from '@/hooks/validacion/useVerifications'
import { supabase } from '@/lib/supabase'

/**
 * Pendientes del dueño: comprobantes por validar, citas sin asignar (próximos 7 días)
 * y fotos de referencia sin revisar. Solo admin; se refresca cada 60 s.
 */
export function usePanelAlerts() {
  const { isAdmin } = useAuth()
  const { data: settings } = useTenantSettings()
  const timeZone = settings ? zonaIANASegura(settings.timezone) : null

  const verifications = usePendingVerificationsCount(isAdmin)
  const unassigned = useUnassignedCount(timeZone, isAdmin)
  const references = useQuery({
    queryKey: queryKeys.agenda.unreviewedReferences,
    enabled: isAdmin && !!supabase,
    refetchInterval: 60_000,
    queryFn: () => fetchUnreviewedReferences(supabase!),
  })

  const pendingVerifications = verifications.data ?? 0
  const unassignedCount = unassigned.data ?? 0
  const unreviewedReferences = references.data ?? []

  return {
    enabled: isAdmin,
    timeZone,
    pendingVerifications,
    unassignedCount,
    unreviewedReferences,
    total: pendingVerifications + unassignedCount + unreviewedReferences.length,
  }
}
