import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeClientPayload } from './clientFields'
import type { ClientFormPayload, ClientRow } from './types'

export function mutationError(message: string, code?: string): Error {
  if (code === '23505' && message.includes('dni')) {
    return new Error('Ya existe otro cliente con ese documento.')
  }
  if (code === '23505' && message.includes('phone')) {
    return new Error('Ya existe otro cliente con ese teléfono.')
  }
  return new Error(message)
}

export async function fetchClients(
  client: SupabaseClient,
  tenantId?: string | null
): Promise<ClientRow[]> {
  let query = client
    .from('clients')
    .select(
      'id, name, phone, phone_country, phone_normalized, email, dni, notes, created_at, tenant_id'
    )
    .order('name')
  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ClientRow[]
}

export async function createClient(
  client: SupabaseClient,
  payload: ClientFormPayload,
  opts: { tenantId: string; country: string }
): Promise<ClientRow> {
  const row = normalizeClientPayload(payload, opts.country)
  const { data, error } = await client
    .from('clients')
    .insert({
      tenant_id: opts.tenantId,
      ...row,
    })
    .select(
      'id, name, phone, phone_country, phone_normalized, email, dni, notes, created_at, tenant_id'
    )
    .single()

  if (error) {
    throw mutationError(error.message, error.code)
  }
  return data as ClientRow
}

export async function updateClient(
  client: SupabaseClient,
  id: string,
  payload: ClientFormPayload,
  opts: { country: string }
): Promise<ClientRow> {
  const row = normalizeClientPayload(payload, opts.country)
  const { data, error } = await client
    .from('clients')
    .update(row)
    .eq('id', id)
    .select(
      'id, name, phone, phone_country, phone_normalized, email, dni, notes, created_at, tenant_id'
    )
    .single()

  if (error) {
    throw mutationError(error.message, error.code)
  }
  return data as ClientRow
}

export async function deleteClient(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
