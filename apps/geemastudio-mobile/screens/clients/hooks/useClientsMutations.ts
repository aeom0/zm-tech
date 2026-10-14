import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createClient, updateClient, type ClientFormPayload } from '@geemastudio/data'

import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

export type { ClientFormPayload }

export function useClientsMutations() {
  const queryClient = useQueryClient()
  const { tenantId } = useProfileTenantId()
  const { config } = useTenant()
  const country = config.locale.country

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
      const created = await createClient(supabase, payload, { tenantId, country })
      return { id: created.id }
    },
    onSuccess: invalidateClients,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ClientFormPayload }) => {
      await updateClient(supabase, id, payload, { country })
    },
    onSuccess: invalidateClients,
  })

  return { createMutation, updateMutation }
}
