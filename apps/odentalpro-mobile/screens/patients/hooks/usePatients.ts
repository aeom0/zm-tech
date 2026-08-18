import { useQuery } from '@tanstack/react-query'

import { useOdentalAuth, useTenant } from '@zmtech/tenant-config/odental'
import { supabase } from '@/lib/supabase'

import type { OdentalPatientRow } from '../types'

/** Lista de pacientes del tenant activo, ordenada alfabéticamente. */
export function usePatients() {
  const { isAuthenticated } = useOdentalAuth()
  const { tenantId } = useTenant()

  return useQuery({
    queryKey: ['odental_patients', tenantId],
    queryFn: async (): Promise<OdentalPatientRow[]> => {
      const { data, error } = await supabase
        .from('odental_patients')
        .select(
          'id, tenant_id, full_name, phone, birth_date, blood_type, allergies, medical_notes, created_at'
        )
        .eq('tenant_id', tenantId as string)
        .order('full_name')

      if (error) throw error
      return (data as OdentalPatientRow[]) ?? []
    },
    enabled: isAuthenticated && !!tenantId,
  })
}
