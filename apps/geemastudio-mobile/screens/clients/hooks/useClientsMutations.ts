import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

export interface ClientFormPayload {
  name: string
  phone: string
  email: string
  notes: string
}

function normalizePayload(payload: ClientFormPayload) {
  const name = payload.name.trim()
  if (!name) {
    throw new Error('El nombre es obligatorio')
  }
  return {
    name,
    phone: payload.phone.trim() || null,
    email: payload.email.trim() || null,
    notes: payload.notes.trim() || null,
  }
}

export function useClientsMutations() {
  const queryClient = useQueryClient()
  const { tenantId } = useProfileTenantId()

  const invalidateClients = () => {
    void queryClient.invalidateQueries({ queryKey: ['clients'] })
    void queryClient.invalidateQueries({ queryKey: ['clients_appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['clients_payments'] })
    void queryClient.invalidateQueries({ queryKey: ['agenda_clients'] })
  }

  const createMutation = useMutation({
    mutationFn: async (payload: ClientFormPayload) => {
      if (!tenantId) {
        throw new Error('No se pudo resolver el tenant')
      }
      const row = normalizePayload(payload)
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...row, tenant_id: tenantId })
        .select('id')
        .single()
      if (error) {
        throw new Error(error.message)
      }
      return data
    },
    onSuccess: invalidateClients,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ClientFormPayload }) => {
      const row = normalizePayload(payload)
      const { error } = await supabase.from('clients').update(row).eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: invalidateClients,
  })

  return { createMutation, updateMutation }
}
