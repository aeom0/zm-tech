import type { SupabaseClient } from '@supabase/supabase-js'

import { slugifyCategoryKey } from './inventoryCategories'
import type {
  InventoryCategoryRow,
  InventoryItem,
  InventoryItemInput,
  InventoryMovement,
} from './types'

const ITEM_COLUMNS = 'id, tenant_id, name, type, category, quantity, min_stock, unit, price, cost'

export async function fetchInventoryItems(
  client: SupabaseClient,
  tenantId: string
): Promise<InventoryItem[]> {
  const { data, error } = await client
    .from('inventory_items')
    .select(ITEM_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as InventoryItem[]
}

export async function fetchInventoryMovements(
  client: SupabaseClient,
  tenantId: string,
  limit = 20
): Promise<InventoryMovement[]> {
  const { data, error } = await client
    .from('inventory_movements')
    .select('id, item_id, delta, quantity_before, quantity_after, reason, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as InventoryMovement[]
}

export async function createInventoryItem(
  client: SupabaseClient,
  tenantId: string,
  input: InventoryItemInput
): Promise<void> {
  const { error } = await client.from('inventory_items').insert({
    tenant_id: tenantId,
    name: input.name.trim(),
    type: 'countable',
    category: input.category,
    quantity: input.quantity,
    min_stock: input.min_stock,
    unit: input.unit,
    price: null,
    cost: input.cost,
  })
  if (error) throw new Error(error.message)
}

/**
 * Edita el ítem. Si cambia la cantidad, la diferencia pasa por
 * `adjust_inventory_quantity` para que quede en `inventory_movements`.
 */
export async function updateInventoryItem(
  client: SupabaseClient,
  tenantId: string,
  id: string,
  input: InventoryItemInput
): Promise<void> {
  const { data: current, error: readError } = await client
    .from('inventory_items')
    .select('quantity')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  if (!current) throw new Error('El producto ya no existe.')

  const { error } = await client
    .from('inventory_items')
    .update({
      name: input.name.trim(),
      category: input.category,
      min_stock: input.min_stock,
      unit: input.unit,
      cost: input.cost,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)

  const delta =
    Math.max(0, Math.round(input.quantity)) - Number((current as { quantity: number }).quantity)
  if (delta !== 0) await adjustInventoryQuantity(client, id, delta)
}

/** Ajuste de stock con registro de movimiento (RPC atómica). */
export async function adjustInventoryQuantity(
  client: SupabaseClient,
  id: string,
  delta: number
): Promise<void> {
  const { error } = await client.rpc('adjust_inventory_quantity', {
    p_item_id: id,
    p_delta: delta,
  })
  if (error) throw new Error(error.message)
}

export async function deleteInventoryItem(
  client: SupabaseClient,
  tenantId: string,
  id: string
): Promise<void> {
  const { error } = await client
    .from('inventory_items')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
}

export async function fetchInventoryCategories(
  client: SupabaseClient,
  tenantId: string
): Promise<InventoryCategoryRow[]> {
  const { data, error } = await client
    .from('inventory_categories')
    .select('id, key, label, sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as InventoryCategoryRow[]
}

export async function createInventoryCategory(
  client: SupabaseClient,
  tenantId: string,
  label: string,
  sortOrder: number
): Promise<void> {
  const key = slugifyCategoryKey(label)
  if (!key) throw new Error('Ingresa un nombre válido.')
  const { error } = await client.from('inventory_categories').insert({
    tenant_id: tenantId,
    key,
    label: label.trim(),
    sort_order: sortOrder,
  })
  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una categoría con ese nombre.')
    throw new Error(error.message)
  }
}

/** Solo borra si ningún producto la usa. */
export async function deleteInventoryCategory(
  client: SupabaseClient,
  tenantId: string,
  category: Pick<InventoryCategoryRow, 'id' | 'key'>
): Promise<void> {
  const { count, error: countError } = await client
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })
    .eq('category', category.key)
    .eq('tenant_id', tenantId)
  if (countError) throw new Error(countError.message)
  if ((count ?? 0) > 0) {
    throw new Error('Tiene productos asignados. Muévelos a otra categoría antes de eliminarla.')
  }
  const { error } = await client
    .from('inventory_categories')
    .delete()
    .eq('id', category.id)
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)
}
