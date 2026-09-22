import { supabase } from '@/lib/supabase'

export type Producto = {
  id: string
  name: string
  description: string | null
  price: number | null
  quantity: number
  min_stock: number
  unit: string
  category: string | null
  image_url: string | null
  is_sellable: boolean
}

export type ProductoInput = {
  name: string
  description: string | null
  price: number | null
  quantity: number
  min_stock: number
  unit: string
  category: string | null
  image_url: string | null
}

const SELECT = 'id, name, description, price, quantity, min_stock, unit, category, image_url, is_sellable'

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local'
    )
  }
  return supabase
}

function normalize(row: Record<string, unknown>): Producto {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: row.description != null ? String(row.description) : null,
    price: row.price != null ? Number(row.price) : null,
    quantity: Number(row.quantity) || 0,
    min_stock: Number(row.min_stock) || 0,
    unit: String(row.unit ?? 'unidad'),
    category: row.category != null ? String(row.category) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    is_sellable: Boolean(row.is_sellable),
  }
}

/** Productos = inventory_items marcados como vendibles al cliente final. */
export async function fetchProductos(): Promise<Producto[]> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('inventory_items')
    .select(SELECT)
    .eq('is_sellable', true)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => normalize(row as Record<string, unknown>))
}

export async function createProducto(input: ProductoInput): Promise<Producto> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('inventory_items')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
      quantity: input.quantity,
      min_stock: input.min_stock,
      unit: input.unit.trim() || 'unidad',
      category: input.category?.trim() || null,
      image_url: input.image_url,
      is_sellable: true,
    })
    .select(SELECT)
    .single()
  if (error) throw error
  return normalize(data as Record<string, unknown>)
}

export async function updateProducto(id: string, input: Partial<ProductoInput>): Promise<Producto> {
  const sb = requireSupabase()
  const payload: Record<string, unknown> = {}
  if (input.name != null) payload.name = input.name.trim()
  if (input.description !== undefined) payload.description = input.description?.trim() || null
  if (input.price !== undefined) payload.price = input.price
  if (input.quantity != null) payload.quantity = input.quantity
  if (input.min_stock != null) payload.min_stock = input.min_stock
  if (input.unit != null) payload.unit = input.unit.trim() || 'unidad'
  if (input.category !== undefined) payload.category = input.category?.trim() || null
  if (input.image_url !== undefined) payload.image_url = input.image_url

  const { data, error } = await sb
    .from('inventory_items')
    .update(payload)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return normalize(data as Record<string, unknown>)
}

/** No se borra el insumo: se deja de ofrecer a clientes (is_sellable=false). */
export async function unlistProducto(id: string): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('inventory_items').update({ is_sellable: false }).eq('id', id)
  if (error) throw error
}
