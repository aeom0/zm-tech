// ============================================================
// Coordinador de predicción de categoría ML.
// El screen solo renderiza: status, predictions, selected, missing.
// ============================================================
import { useCallback, useMemo, useState } from 'react';

import { mlCategoryService } from '../services/mercadolibre/mlCategoryService';
import { mlListingService } from '../services/mercadolibre/mlListingService';
import type {
  MlAttribute,
  MlCategoryPrediction,
  RepmaxProduct,
} from '@repmax/repmax-schema/mlListing';

export type MlPredictionStatus = 'idle' | 'predicting' | 'ready' | 'error';

export interface UseMlCategoryPredictionParams {
  product: RepmaxProduct | null;
  storeId?: string;
  productId?: string;
  siteId?: string;
}

export function useMlCategoryPrediction({
  product,
  storeId,
  productId,
  siteId = 'MLV',
}: UseMlCategoryPredictionParams) {
  const [status, setStatus] = useState<MlPredictionStatus>('idle');
  const [predictions, setPredictions] = useState<MlCategoryPrediction[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<MlCategoryPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mappedAttributes, missingAttributes } = useMemo((): {
    mappedAttributes: Record<string, unknown>;
    missingAttributes: MlAttribute[];
  } => {
    if (!product || !selectedPrediction) {
      return { mappedAttributes: {}, missingAttributes: [] };
    }
    const result = mlCategoryService.mapProductToMlAttributes(
      product,
      selectedPrediction.attributes,
    );
    return {
      mappedAttributes: result.mapped,
      missingAttributes: result.missing,
    };
  }, [product, selectedPrediction]);

  const persistSelection = useCallback(async (
    prediction: MlCategoryPrediction,
    mapped: Record<string, unknown>,
    missing: MlAttribute[],
  ) => {
    if (!storeId || !productId) return;
    await mlListingService.upsertFromPrediction({
      productId,
      storeId,
      prediction,
      mapped,
      missingCount: missing.length,
    });
  }, [storeId, productId]);

  const selectPrediction = useCallback((prediction: MlCategoryPrediction) => {
    setSelectedPrediction(prediction);
    if (!product) return;
    const result = mlCategoryService.mapProductToMlAttributes(product, prediction.attributes);
    void persistSelection(prediction, result.mapped, result.missing);
  }, [product, persistSelection]);

  const predict = useCallback(async (title: string) => {
    const titulo = title.trim();
    if (!titulo) {
      setStatus('error');
      setError('El título es obligatorio para predecir la categoría.');
      setPredictions([]);
      setSelectedPrediction(null);
      return;
    }
    if (!storeId) {
      setStatus('error');
      setError('No encontramos tu tienda.');
      return;
    }

    setStatus('predicting');
    setError(null);
    try {
      const result = await mlCategoryService.predictCategories(titulo, siteId, storeId);
      setPredictions(result);
      const first = result[0] ?? null;
      setSelectedPrediction(first);
      setStatus('ready');
      if (first && product) {
        const mapped = mlCategoryService.mapProductToMlAttributes(product, first.attributes);
        await persistSelection(first, mapped.mapped, mapped.missing);
      }
    } catch (err) {
      setPredictions([]);
      setSelectedPrediction(null);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudo predecir la categoría.');
    }
  }, [siteId, storeId, product, persistSelection]);

  const reset = useCallback(() => {
    setStatus('idle');
    setPredictions([]);
    setSelectedPrediction(null);
    setError(null);
  }, []);

  return {
    status,
    predictions,
    selectedPrediction,
    mappedAttributes,
    missingAttributes,
    error,
    predict,
    selectPrediction,
    reset,
  };
}
