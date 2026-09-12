import { detectCatalogDialect, parseServiceIds, serializeServiceIds } from '@/hooks/servicios/catalogAdapter'
import { supabase } from '@/lib/supabase'

export type Pack = {
  id: string
  name: string
  description: string | null
  price: number
  service_ids: string[]
  is_active: boolean
  /** ZM: category_id NOT NULL; se infiere del primer servicio al guardar. */
  category_id?: string | null
}

export type PackInput = {
  name: string
  description: string | null
  price: number
  service_ids: string[]
  is_active: boolean
}

const GEEMA_SELECT = 'id, name, description, price, service_ids, is_active'
const ZM_SELECT =
  'id, title, description, pack_price, pack_price_card, category_id, service_ids, is_active, display_order, emoji'

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local'
    )
  }
  return supabase
}

function normalizeGeema(row: Record<string, unknown>): Pack {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: row.description != null ? String(row.description) : null,
    price: Number(row.price) || 0,
    service_ids: parseServiceIds(row.service_ids),
    is_active: Boolean(row.is_active),
  }
}

function normalizeZm(row: Record<string, unknown>): Pack {
  return {
    id: String(row.id),
    name: String(row.title ?? ''),
    description: row.description != null ? String(row.description) : null,
    price: Number(row.pack_price) || 0,
    service_ids: parseServiceIds(row.service_ids),
    is_active: Boolean(row.is_active),
    category_id: row.category_id != null ? String(row.category_id) : null,
  }
}

async function resolveCategoryId(sb: NonNullable<typeof supabase>, serviceIds: string[]): Promise<string> {
  if (serviceIds.length === 0) {
    throw new Error('Elegí al menos un servicio para el pack (en ZM hace falta category_id).')
  }
  const { data, error } = await sb
    .from('services')
    .select('category_id')
    .eq('id', serviceIds[0]!)
    .maybeSingle()
  if (error) throw error
  const cat = data?.category_id as string | null | undefined
  if (!cat) {
    throw new Error('El primer servicio no tiene categoría; no se puede guardar el pack en ZM.')
  }
  return cat
}

export async function fetchPacks(): Promise<Pack[]> {
  const sb = requireSupabase()
  const dialect = await detectCatalogDialect(sb)

  if (dialect === 'zm') {
    const { data, error } = await sb
      .from('packs')
      .select(ZM_SELECT)
      .order('display_order', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row) => normalizeZm(row as Record<string, unknown>))
  }

  const { data, error } = await sb.from('packs').select(GEEMA_SELECT).order('name')
  if (error) throw error
  return (data ?? []).map((row) => normalizeGeema(row as Record<string, unknown>))
}

export async function createPack(input: PackInput): Promise<Pack> {
  const sb = requireSupabase()
  const dialect = await detectCatalogDialect(sb)
  const priceStr = String(input.price)

  if (dialect === 'zm') {
    const category_id = await resolveCategoryId(sb, input.service_ids)
    const { data, error } = await sb
      .from('packs')
      .insert({
        title: input.name.trim(),
        description: input.description?.trim() || '',
        pack_price: priceStr,
        service_ids: serializeServiceIds(input.service_ids, dialect),
        category_id,
        is_active: input.is_active,
        emoji: '✨',
        badge: 'PACK',
      })
      .select(ZM_SELECT)
      .single()
    if (error) throw error
    return normalizeZm(data as Record<string, unknown>)
  }

  const { data, error } = await sb
    .from('packs')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: priceStr,
      service_ids: serializeServiceIds(input.service_ids, dialect),
      is_active: input.is_active,
    })
    .select(GEEMA_SELECT)
    .single()
  if (error) throw error
  return normalizeGeema(data as Record<string, unknown>)
}

export async function updatePack(id: string, input: Partial<PackInput>): Promise<Pack> {
  const sb = requireSupabase()
  const dialect = await detectCatalogDialect(sb)

  if (dialect === 'zm') {
    const serviceIds = input.service_ids ?? []
    const payload: Record<string, unknown> = {}
    if (input.name != null) payload.title = input.name.trim()
    if (input.description !== undefined) payload.description = input.description?.trim() || ''
    if (input.price != null) payload.pack_price = String(input.price)
    if (input.service_ids) {
      payload.service_ids = serializeServiceIds(input.service_ids, dialect)
      payload.category_id = await resolveCategoryId(sb, serviceIds)
    }
    if (input.is_active != null) payload.is_active = input.is_active

    const { data, error } = await sb
      .from('packs')
      .update(payload)
      .eq('id', id)
      .select(ZM_SELECT)
      .single()
    if (error) throw error
    return normalizeZm(data as Record<string, unknown>)
  }

  const payload: Record<string, unknown> = {}
  if (input.name != null) payload.name = input.name.trim()
  if (input.description !== undefined) payload.description = input.description?.trim() || null
  if (input.price != null) payload.price = String(input.price)
  if (input.service_ids) payload.service_ids = serializeServiceIds(input.service_ids, dialect)
  if (input.is_active != null) payload.is_active = input.is_active

  const { data, error } = await sb
    .from('packs')
    .update(payload)
    .eq('id', id)
    .select(GEEMA_SELECT)
    .single()
  if (error) throw error
  return normalizeGeema(data as Record<string, unknown>)
}

export async function deletePack(id: string): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('packs').delete().eq('id', id)
  if (error) throw error
}

export async function togglePackActive(id: string, is_active: boolean): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('packs').update({ is_active }).eq('id', id)
  if (error) throw error
}
