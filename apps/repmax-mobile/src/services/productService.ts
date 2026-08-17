import { supabase } from '../utils/supabase';
import type { MlListingStatus } from '@repmax/repmax-schema/mlListing';
import type { PartCondition, Product, VehicleType } from '../types/database';

/** Fila snake_case de PostgREST (`repmax_products`). */
interface ProductRow {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  brand: string;
  model: string;
  year_from: number | null;
  year_to: number | null;
  vehicle_type: VehicleType | null;
  condition: PartCondition | null;
  part_number: string | null;
  color: string | null;
  price_usd: string | number;
  price_bs: string | number | null;
  stock: number | null;
  min_stock: number | null;
  photos: string[] | null;
  ml_publish_intent: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  repmax_ml_listings?: MlListingEmbed[] | MlListingEmbed | null;
}

interface MlListingEmbed {
  status: MlListingStatus;
  ml_item_id: string | null;
  ml_category_id: string | null;
  ml_category_name: string | null;
}

function embedListing(row: ProductRow): MlListingEmbed | null {
  const raw = row.repmax_ml_listings;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function mapProduct(row: ProductRow): Product {
  const listing = embedListing(row);
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    description: row.description ?? undefined,
    brand: row.brand,
    model: row.model,
    yearFrom: row.year_from ?? undefined,
    yearTo: row.year_to ?? undefined,
    vehicleType: row.vehicle_type ?? undefined,
    condition: row.condition ?? 'NEW',
    partNumber: row.part_number ?? undefined,
    color: row.color ?? undefined,
    priceUsd: parseFloat(String(row.price_usd)),
    priceBs: row.price_bs != null ? parseFloat(String(row.price_bs)) : undefined,
    stock: row.stock ?? 0,
    minStock: row.min_stock ?? 1,
    photos: Array.isArray(row.photos)
      ? row.photos.filter((uri): uri is string => typeof uri === 'string' && uri.length > 0)
      : [],
    mlPublishIntent: row.ml_publish_intent ?? false,
    mlListingStatus: listing?.status,
    mlItemId: listing?.ml_item_id ?? undefined,
    mlCategoryId: listing?.ml_category_id ?? undefined,
    mlCategoryName: listing?.ml_category_name ?? undefined,
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

const PRODUCT_SELECT = '*, repmax_ml_listings(status, ml_item_id, ml_category_id, ml_category_name)';

export const productService = {
  async getAll(filters?: { q?: string; condition?: string; brand?: string; stock?: string }): Promise<Product[]> {
    let query = supabase
      .from('repmax_products')
      .select(PRODUCT_SELECT)
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
      .select(PRODUCT_SELECT)
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
      color: product.color,
      price_usd: product.priceUsd,
      price_bs: product.priceBs,
      stock: product.stock ?? 0,
      min_stock: product.minStock ?? 1,
      photos: product.photos,
      ml_publish_intent: product.mlPublishIntent ?? false,
    };

    const { data, error } = await supabase
      .from('repmax_products')
      .insert(payload)
      .select(PRODUCT_SELECT)
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
    if (product.color !== undefined) payload.color = product.color;
    if (product.priceUsd !== undefined) payload.price_usd = product.priceUsd;
    if (product.priceBs !== undefined) payload.price_bs = product.priceBs;
    if (product.stock !== undefined) payload.stock = product.stock;
    if (product.minStock !== undefined) payload.min_stock = product.minStock;
    if (product.photos !== undefined) payload.photos = product.photos;
    if (product.mlPublishIntent !== undefined) payload.ml_publish_intent = product.mlPublishIntent;

    const { data, error } = await supabase
      .from('repmax_products')
      .update(payload)
      .eq('id', id)
      .select(PRODUCT_SELECT)
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
