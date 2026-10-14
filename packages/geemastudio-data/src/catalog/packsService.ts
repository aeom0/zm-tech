import type { SupabaseClient } from '@supabase/supabase-js'
import {
  detectCatalogDialect,
  rowToPack,
  serializeServiceIds,
  sortCatalogList,
} from './catalogAdapter'
import type { CatalogDialect, Pack, PackInput } from './types'

export const GEEMA_PACKS_SELECT = 'id, name, description, price, service_ids, is_active'
export const ZM_PACKS_SELECT =
  'id, title, description, pack_price, category_id, service_ids, is_active, display_order, emoji, slot_minutes'

export async function fetchPacks(
  client: SupabaseClient,
  dialectOverride?: CatalogDialect
): Promise<Pack[]> {
  const dialect = dialectOverride ?? (await detectCatalogDialect(client))

  const { data, error } =
    dialect === 'zm'
      ? await client
          .from('packs')
          .select(ZM_PACKS_SELECT)
          .order('display_order', { ascending: true })
      : await client.from('packs').select(GEEMA_PACKS_SELECT).order('name', { ascending: true })

  if (error) throw new Error(error.message)

  const items = ((data ?? []) as Record<string, unknown>[]).map((row) => rowToPack(row, dialect))
  return sortCatalogList(items, {
    getActive: (p) => p.is_active,
    getOrder: (p) => p.display_order,
    getName: (p) => p.name,
  })
}

async function resolveCategoryId(client: SupabaseClient, serviceIds: string[]): Promise<string> {
  if (serviceIds.length === 0) {
    throw new Error('Elige al menos un servicio para el pack (en ZM hace falta categoría).')
  }
  const { data, error } = await client
    .from('services')
    .select('category_id')
    .eq('id', serviceIds[0]!)
    .maybeSingle()

  if (error || !data?.category_id) {
    throw new Error('No se pudo determinar la categoría del pack a partir de los servicios.')
  }
  return String(data.category_id)
}

export async function createPack(
  client: SupabaseClient,
  input: PackInput,
  dialectOverride?: CatalogDialect
): Promise<Pack> {
  const dialect = dialectOverride ?? (await detectCatalogDialect(client))

  if (dialect === 'zm') {
    const categoryId = input.category_id ?? (await resolveCategoryId(client, input.service_ids))
    const payload: Record<string, unknown> = {
      title: input.name.trim(),
      description: input.description?.trim() || '',
      pack_price: input.price,
      service_ids: serializeServiceIds(input.service_ids, dialect),
      category_id: categoryId,
      is_active: input.is_active,
      emoji: input.emoji ?? input.badge ?? null,
      slot_minutes: input.slot_minutes ?? null,
    }
    const { data, error } = await client
      .from('packs')
      .insert(payload)
      .select(ZM_PACKS_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return rowToPack(data as Record<string, unknown>, dialect)
  }

  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: input.price,
    service_ids: serializeServiceIds(input.service_ids, dialect),
    is_active: input.is_active,
  }
  const { data, error } = await client
    .from('packs')
    .insert(payload)
    .select(GEEMA_PACKS_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return rowToPack(data as Record<string, unknown>, dialect)
}

export async function updatePack(
  client: SupabaseClient,
  id: string,
  input: Partial<PackInput>,
  dialectOverride?: CatalogDialect
): Promise<Pack> {
  const dialect = dialectOverride ?? (await detectCatalogDialect(client))

  if (dialect === 'zm') {
    const patch: Record<string, unknown> = {}
    if (input.name !== undefined) patch.title = input.name.trim()
    if (input.description !== undefined) patch.description = input.description?.trim() || ''
    if (input.price !== undefined) patch.pack_price = input.price
    if (input.service_ids !== undefined) {
      patch.service_ids = serializeServiceIds(input.service_ids, dialect)
      if (!input.category_id && input.service_ids.length > 0) {
        try {
          patch.category_id = await resolveCategoryId(client, input.service_ids)
        } catch {
          // conservar el category_id existente si no se puede resolver
        }
      }
    }
    if (input.category_id !== undefined) patch.category_id = input.category_id
    if (input.is_active !== undefined) patch.is_active = input.is_active
    if (input.emoji !== undefined || input.badge !== undefined) {
      patch.emoji = input.emoji ?? input.badge ?? null
    }
    if (input.slot_minutes !== undefined) patch.slot_minutes = input.slot_minutes

    const { data, error } = await client
      .from('packs')
      .update(patch)
      .eq('id', id)
      .select(ZM_PACKS_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return rowToPack(data as Record<string, unknown>, dialect)
  }

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.price !== undefined) patch.price = input.price
  if (input.service_ids !== undefined) {
    patch.service_ids = serializeServiceIds(input.service_ids, dialect)
  }
  if (input.is_active !== undefined) patch.is_active = input.is_active

  const { data, error } = await client
    .from('packs')
    .update(patch)
    .eq('id', id)
    .select(GEEMA_PACKS_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return rowToPack(data as Record<string, unknown>, dialect)
}

export async function deletePack(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('packs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function togglePackActive(
  client: SupabaseClient,
  id: string,
  isActive: boolean
): Promise<void> {
  const { error } = await client.from('packs').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
}
