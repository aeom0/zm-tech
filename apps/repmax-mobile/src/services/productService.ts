import { supabase } from '../utils/supabase';
import type { Product } from '../types/database';

// Mapea snake_case de Supabase a camelCase
function mapProduct(row: any): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    description: row.description,
    brand: row.brand,
    model: row.model,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    vehicleType: row.vehicle_type,
    condition: row.condition,
    partNumber: row.part_number,
    priceUsd: parseFloat(row.price_usd),
    priceBs: row.price_bs ? parseFloat(row.price_bs) : undefined,
    stock: row.stock,
    minStock: row.min_stock,
    photos: row.photos,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const productService = {
  async getAll(filters?: { q?: string; condition?: string; brand?: string; stock?: string }): Promise<Product[]> {
    let query = supabase
      .from('repmax_products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filters?.condition) query = query.eq('condition', filters.condition);
    if (filters?.brand) query = query.ilike('brand', `%${filters.brand}%`);
    if (filters?.q) query = query.or(`title.ilike.%${filters.q}%,brand.ilike.%${filters.q}%,model.ilike.%${filters.q}%`);
    if (filters?.stock === 'low') query = query.lt('stock', 3);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapProduct);
  },

  async getById(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('repmax_products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return mapProduct(data);
  },

  async create(product: Partial<Product>): Promise<Product> {
    const payload: Record<string, unknown> = {
      store_id: product.storeId,
      title: product.title,
      description: product.description,
      brand: product.brand,
      model: product.model,
      year_from: product.yearFrom,
      year_to: product.yearTo,
      vehicle_type: product.vehicleType,
      condition: product.condition ?? 'NEW',
      part_number: product.partNumber,
      price_usd: product.priceUsd,
      price_bs: product.priceBs,
      stock: product.stock ?? 0,
      min_stock: product.minStock ?? 1,
      photos: product.photos,
    };

    const { data, error } = await supabase
      .from('repmax_products')
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapProduct(data);
  },

  async update(id: string, product: Partial<Product>): Promise<Product> {
    const payload: Record<string, unknown> = {};
    if (product.title !== undefined) payload.title = product.title;
    if (product.description !== undefined) payload.description = product.description;
    if (product.brand !== undefined) payload.brand = product.brand;
    if (product.model !== undefined) payload.model = product.model;
    if (product.yearFrom !== undefined) payload.year_from = product.yearFrom;
    if (product.yearTo !== undefined) payload.year_to = product.yearTo;
    if (product.vehicleType !== undefined) payload.vehicle_type = product.vehicleType;
    if (product.condition !== undefined) payload.condition = product.condition;
    if (product.partNumber !== undefined) payload.part_number = product.partNumber;
    if (product.priceUsd !== undefined) payload.price_usd = product.priceUsd;
    if (product.priceBs !== undefined) payload.price_bs = product.priceBs;
    if (product.stock !== undefined) payload.stock = product.stock;
    if (product.minStock !== undefined) payload.min_stock = product.minStock;
    if (product.photos !== undefined) payload.photos = product.photos;

    const { data, error } = await supabase
      .from('repmax_products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapProduct(data);
  },

  async deactivate(id: string): Promise<void> {
    const { error } = await supabase
      .from('repmax_products')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
