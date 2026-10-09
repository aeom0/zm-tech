import { useMutation, useQueryClient } from '@tanstack/react-query'

import { checkDocument, checkEmail, checkPhone } from '@/lib/clientFields'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

export interface ClientFormPayload {
  name: string
  phone: string
  email: string
  dni: string
  notes: string
}

function mutationError(message: string, code?: string) {
  if (code === '23505' && message.includes('dni')) {
    return new Error('Ya existe otro cliente con ese documento.')
  }
  if (code === '23505' && message.includes('phone')) {
    return new Error('Ya existe otro cliente con ese teléfono.')
  }
  return new Error(message)
}

/** Valida con las mismas reglas del formulario y arma la fila (teléfono con país y número normalizado). */
function normalizePayload(payload: ClientFormPayload, country: string) {
  const name = payload.name.trim()
  if (!name) {
    throw new Error('El nombre es obligatorio')
  }
  const phone = checkPhone(payload.phone, country)
  const document = checkDocument(payload.dni, country)
  const email = checkEmail(payload.email)
  const error = phone.error ?? document.error ?? email.error
  if (error) {
    throw new Error(error)
  }
  return {
    name,
    phone: phone.phone,
    phone_country: phone.phoneCountry,
    phone_normalized: phone.phoneNormalized,
    email: payload.email.trim() || null,
    dni: document.value,
    notes: payload.notes.trim() || null,
  }
}

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
      const row = normalizePayload(payload, country)
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...row, tenant_id: tenantId })
        .select('id')
        .single()
      if (error) {
        throw mutationError(error.message, error.code)
      }
      return data
    },
    onSuccess: invalidateClients,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ClientFormPayload }) => {
      const row = normalizePayload(payload, country)
      const { error } = await supabase.from('clients').update(row).eq('id', id)
      if (error) {
        throw mutationError(error.message, error.code)
      }
    },
    onSuccess: invalidateClients,
  })

  return { createMutation, updateMutation }
}
