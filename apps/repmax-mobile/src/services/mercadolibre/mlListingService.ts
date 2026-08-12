// Persistencia de la predicción en repmax_ml_listings (draft → ready).
import { supabase } from '../../utils/supabase';
import type { MlCategoryPrediction } from '@repmax/repmax-schema/mlListing';

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
};
