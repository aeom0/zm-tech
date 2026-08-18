'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { clienteFormSchema, type ClienteFormValues } from '@/lib/validation/clientes'

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string }

export async function crearCliente(
  values: ClienteFormValues
): Promise<ActionResult<{ id: string }>> {
  const parsed = clienteFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hub_clients')
    .insert({
      name: parsed.data.name,
      contact_name: parsed.data.contactName ?? null,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
      whatsapp: parsed.data.whatsapp ?? null,
      country: parsed.data.country ?? null,
      city: parsed.data.city ?? null,
      vertical: parsed.data.vertical,
      status: parsed.data.status,
      source: parsed.data.source,
      source_contact_id: parsed.data.sourceContactId ?? null,
      source_quote_lead_id: parsed.data.sourceQuoteLeadId ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/clientes')
  return { ok: true, data: { id: data.id as string } }
}

export async function actualizarCliente(
  id: string,
  values: ClienteFormValues
): Promise<ActionResult> {
  const parsed = clienteFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('hub_clients')
    .update({
      name: parsed.data.name,
      contact_name: parsed.data.contactName ?? null,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
      whatsapp: parsed.data.whatsapp ?? null,
      country: parsed.data.country ?? null,
      city: parsed.data.city ?? null,
      vertical: parsed.data.vertical,
      status: parsed.data.status,
      source: parsed.data.source,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  return { ok: true, data: null }
}
