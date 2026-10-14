import { useQuery } from '@tanstack/react-query'
import {
  countPendingVerifications,
  countUnassignedAppointments,
  fetchUnreviewedReferences,
  queryKeys,
  type UnreviewedReferenceAppointment,
} from '@geemastudio/data'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'

export type { UnreviewedReferenceAppointment }

/**
 * Devuelve los conteos de badges para el tab Más y sus items.
 * Solo activo para roles admin (dev / owner).
 * Se refresca automáticamente cada 60 segundos.
 */
export function usePendingBadgeCount() {
  const { isAdmin } = useAuth()
  const { config } = useTenant()
  const timeZone = config.locale.timezone

  // Comprobantes de pago enviados por WhatsApp pendientes de validación
  const { data: paymentValidationCount = 0 } = useQuery<number>({
    queryKey: queryKeys.agenda.pendingVerificationsCount,
    queryFn: () => countPendingVerifications(supabase),
    refetchInterval: 60_000,
    enabled: isAdmin,
  })

  // Citas SIN profesional asignado en los próximos 7 días (hacia adelante)
  const { data: unassignedCount = 0 } = useQuery<number>({
    queryKey: [...queryKeys.agenda.unassignedAppointmentsCount, timeZone],
    queryFn: () => countUnassignedAppointments(supabase, timeZone, 7),
    refetchInterval: 60_000,
    enabled: isAdmin,
  })

  // Citas con fotos de referencia sin revisar (reference_image_paths no vacío
  // y reference_reviewed_at aún null)
  const { data: unreviewedReferences = [] } = useQuery<UnreviewedReferenceAppointment[]>({
    queryKey: queryKeys.agenda.unreviewedReferences,
    queryFn: () => fetchUnreviewedReferences(supabase),
    refetchInterval: 60_000,
    enabled: isAdmin,
  })
  const unreviewedReferencesCount = unreviewedReferences.length

  // Badge total del tab: pagos pendientes + citas sin profesional asignado.
  const tabBadgeCount = paymentValidationCount + unassignedCount

  return {
    paymentValidationCount,
    unassignedCount,
    unreviewedReferences,
    unreviewedReferencesCount,
    tabBadgeCount,
  }
}
