// ============================================================
// Predicción de categoría / atributos MercadoLibre
// Llama Edge Function ml-predict-category (tokens nunca salen al cliente).
// ============================================================
import { supabase } from '../../utils/supabase';
import {
  ML_REQUIRED_ATTRIBUTE_TAGS,
  type MlAttribute,
  type MlAttributeTag,
  type MlCategoryPrediction,
  type RepmaxProduct,
} from '@repmax/repmax-schema/mlListing';

/** Atributos base para mapper local sin predictor API (modo manual E2). */
export const ML_MANUAL_BASE_ATTRIBUTES: MlAttribute[] = [
  { id: 'PART_NUMBER', name: 'Número de parte', tag: 'required' },
  { id: 'BRAND', name: 'Marca', tag: 'required' },
  { id: 'MODEL', name: 'Modelo', tag: 'optional' },
  { id: 'ITEM_CONDITION', name: 'Condición', tag: 'required' },
  { id: 'COLOR', name: 'Color', tag: 'conditional_required' },
];

const TAGS_OBLIGATORIOS = new Set<MlAttributeTag>(ML_REQUIRED_ATTRIBUTE_TAGS);

/** IDs de ML que corresponden al número de parte del producto. */
const IDS_NUMERO_PARTE = new Set([
  'PART_NUMBER',
  'MPN',
  'MANUFACTURER_PART_NUMBER',
]);

export interface MlAttributeMapping {
  mapped: Record<string, unknown>;
  missing: MlAttribute[];
}

function textoONulo(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function esAtributoNumeroParte(attr: MlAttribute): boolean {
  const id = attr.id.toUpperCase();
  return IDS_NUMERO_PARTE.has(id) || id.includes('PART_NUMBER') || id === 'MPN';
}

function condicionMl(condition: string | null | undefined): string | null {
  if (!condition) return null;
  if (condition === 'NEW') return 'Nuevo';
  if (condition === 'USED') return 'Usado';
  return textoONulo(condition);
}

function valorParaAtributo(product: RepmaxProduct, attr: MlAttribute): string | null {
  const id = attr.id.toUpperCase();
  if (esAtributoNumeroParte(attr)) return textoONulo(product.partNumber);
  if (id === 'BRAND') return textoONulo(product.brand);
  if (id === 'MODEL') return textoONulo(product.model);
  if (id === 'ITEM_CONDITION') return condicionMl(product.condition);
  if (id === 'COLOR') return textoONulo(product.color);
  return null;
}

function esObligatorio(attr: MlAttribute): boolean {
  return TAGS_OBLIGATORIOS.has(attr.tag);
}

function mensajeFn(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err;
  }
  return fallback;
}

export function filtrarAtributosObligatorios(attrs: MlAttribute[]): MlAttribute[] {
  return attrs.filter(esObligatorio);
}

export const mlCategoryService = {
  async predictCategories(
    title: string,
    siteId: string,
    storeId: string,
  ): Promise<MlCategoryPrediction[]> {
    const { data, error } = await supabase.functions.invoke('ml-predict-category', {
      body: { storeId, title, siteId },
    });
    if (error) {
      throw new Error(mensajeFn(data, error.message || 'No se pudo predecir la categoría.'));
    }
    const predictions = (data as { predictions?: MlCategoryPrediction[] } | null)?.predictions;
    return Array.isArray(predictions) ? predictions : [];
  },

  async getCategoryAttributes(categoryId: string, storeId: string): Promise<MlAttribute[]> {
    const { data, error } = await supabase.functions.invoke('ml-predict-category', {
      body: { storeId, categoryId },
    });
    if (error) {
      throw new Error(mensajeFn(data, error.message || 'No se pudieron cargar los atributos.'));
    }
    const attrs = (data as { attributes?: MlAttribute[] } | null)?.attributes ?? [];
    return filtrarAtributosObligatorios(Array.isArray(attrs) ? attrs : []);
  },

  mapProductToMlAttributes(
    product: RepmaxProduct,
    attrs: MlAttribute[],
  ): MlAttributeMapping {
    const mapped: Record<string, unknown> = {};
    const missing: MlAttribute[] = [];

    for (const attr of attrs) {
      const valueName = valorParaAtributo(product, attr) ?? attr.valueName?.trim() ?? null;
      if (valueName) {
        mapped[attr.id] = {
          id: attr.id,
          name: attr.name,
          valueName,
          ...(attr.valueId ? { valueId: attr.valueId } : {}),
        };
        continue;
      }
      if (esObligatorio(attr)) {
        missing.push(attr);
      }
    }

    return { mapped, missing };
  },

  /** Mapper local para categoría elegida manualmente (sin predictor API). */
  mapManualAttributes(
    product: RepmaxProduct,
    requiresColor: boolean,
  ): MlAttributeMapping {
    const attrs = requiresColor
      ? ML_MANUAL_BASE_ATTRIBUTES
      : ML_MANUAL_BASE_ATTRIBUTES.filter((a) => a.id !== 'COLOR');
    return this.mapProductToMlAttributes(product, attrs);
  },
};
