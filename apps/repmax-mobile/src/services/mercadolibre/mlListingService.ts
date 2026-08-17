// Persistencia de la predicción en repmax_ml_listings (draft → ready).
import { supabase } from '../../utils/supabase';
import type { MlCategoryPrediction } from '@repmax/repmax-schema/mlListing';
import type { ItemAlertaMlStock } from '../../utils/mlStockAlert';

export const mlListingService = {
  async upsertFromPrediction(params: {
    productId: string;
    storeId: string;
    prediction: MlCategoryPrediction;
    mapped: Record<string, unknown>;
    missingCount: number;
  }): Promise<void> {
    const status = params.missingCount === 0 ? 'ready' : 'draft';
    const { error } = await supabase.from('repmax_ml_listings').upsert(
      {
        product_id: params.productId,
        store_id: params.storeId,
        ml_domain_id: params.prediction.domainId,
        ml_category_id: params.prediction.categoryId,
        ml_category_name: params.prediction.categoryName,
        ml_attributes_snapshot: params.mapped,
        prediction_confidence: params.prediction.confidenceRank,
        status,
        last_error: null,
      },
      { onConflict: 'product_id' },
    );
    if (error) throw new Error(error.message);
  },

  /** Categoría elegida manualmente + snapshot de atributos (E2 sin predictor API). */
  async upsertManualCategory(params: {
    productId: string;
    storeId: string;
    categoryId: string;
    categoryName: string;
    mapped: Record<string, unknown>;
    missingCount: number;
  }): Promise<void> {
    const status = params.missingCount === 0 ? 'ready' : 'draft';
    const { error } = await supabase.from('repmax_ml_listings').upsert(
      {
        product_id: params.productId,
        store_id: params.storeId,
        ml_category_id: params.categoryId,
        ml_category_name: params.categoryName,
        ml_attributes_snapshot: params.mapped,
        status,
        last_error: null,
      },
      { onConflict: 'product_id' },
    );
    if (error) throw new Error(error.message);
  },

  /** Marca draft/ready según checklist local (modo puente sin predictor API). */
  async upsertReadiness(params: {
    productId: string;
    storeId: string;
    listo: boolean;
  }): Promise<void> {
    const status = params.listo ? 'ready' : 'draft';
    const { error } = await supabase.from('repmax_ml_listings').upsert(
      {
        product_id: params.productId,
        store_id: params.storeId,
        status,
        last_error: null,
      },
      { onConflict: 'product_id' },
    );
    if (error) throw new Error(error.message);
  },

  async removeForProduct(productId: string): Promise<void> {
    const { error } = await supabase
      .from('repmax_ml_listings')
      .delete()
      .eq('product_id', productId);
    if (error) throw new Error(error.message);
  },

  /** Tras export CSV — lote a estado exported. */
  async markExportedBatch(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;
    const { error } = await supabase
      .from('repmax_ml_listings')
      .update({ status: 'exported', last_error: null })
      .in('product_id', productIds);
    if (error) throw new Error(error.message);
  },

  /** Vendedor confirmó publicación manual en ML. */
  async markPublishedManual(params: {
    productId: string;
    storeId: string;
    mlItemId?: string;
  }): Promise<void> {
    const { error } = await supabase.from('repmax_ml_listings').upsert(
      {
        product_id: params.productId,
        store_id: params.storeId,
        status: 'published_manual',
        ml_item_id: params.mlItemId?.trim() || null,
        last_error: null,
      },
      { onConflict: 'product_id' },
    );
    if (error) throw new Error(error.message);
  },

  /** Tras venta POS: marcar listings publicados en ML como needs_update. */
  async markNeedsUpdateAfterSale(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;
    const { error } = await supabase
      .from('repmax_ml_listings')
      .update({ status: 'needs_update', last_error: null })
      .in('product_id', productIds)
      .in('status', ['published_manual', 'published']);
    if (error) throw new Error(error.message);
  },

  /** Productos vendidos que siguen publicados en ML (consulta DB). */
  async findPublishedOnMlForSale(productIds: string[]): Promise<ItemAlertaMlStock[]> {
    if (productIds.length === 0) return [];
    const { data, error } = await supabase
      .from('repmax_ml_listings')
      .select('product_id, ml_item_id, repmax_products(title, part_number)')
      .in('product_id', productIds)
      .in('status', ['published_manual', 'published']);
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const prod = row.repmax_products as { title?: string; part_number?: string } | null;
      const nested = Array.isArray(prod) ? prod[0] : prod;
      return {
        productId: String(row.product_id),
        title: nested?.title ?? 'Producto',
        partNumber: nested?.part_number ?? undefined,
        mlItemId: row.ml_item_id ? String(row.ml_item_id) : undefined,
      };
    });
  },

  /** IDs con listing activo en ML (manual o API). */
  async filterPublishedOnMl(productIds: string[]): Promise<string[]> {
    const items = await this.findPublishedOnMlForSale(productIds);
    return items.map((i) => i.productId);
  },
};
