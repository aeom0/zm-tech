// ============================================================
// Estado y persistencia del formulario de producto (fotos + ficha)
// El screen decide navegación / Alert; este hook no toca React Navigation.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { MlListingStatus } from '@repmax/repmax-schema/mlListing';

import { ML_API_ENABLED } from '../constants/mlConfig';
import { useAuth } from '../context/AuthContext';
import { useMercadoLibreConnection } from './useMercadoLibreConnection';
import { mlListingService } from '../services/mercadolibre/mlListingService';
import { productPhotoService } from '../services/productPhotoService';
import { productService } from '../services/productService';
import { ML_PHOTO } from '../utils/mlPhotoRules';
import { evaluarListoMl } from '../utils/mlReadiness';
import { sugerirTituloMl } from '../utils/mlTitleSuggestion';
import type { MlManualCategory } from '../constants/mlManualCategories';
import { categoriaManualPorId } from '../constants/mlManualCategories';
import { mlCategoryService } from '../services/mercadolibre/mlCategoryService';
import type { PartCondition, VehicleType } from '../types/database';

export interface ProductFormState {
  title: string;
  description: string;
  brand: string;
  model: string;
  yearFrom: string;
  yearTo: string;
  vehicleType: VehicleType | '';
  condition: PartCondition;
  partNumber: string;
  color: string;
  priceUsd: string;
  stock: string;
  minStock: string;
}

export type ProductFormSaveResult =
  | { success: true }
  | { success: false; title: string; message: string };

const INITIAL_FORM: ProductFormState = {
  title: '', description: '', brand: '', model: '',
  yearFrom: '', yearTo: '', vehicleType: '',
  condition: 'NEW', partNumber: '', color: '',
  priceUsd: '', stock: '0', minStock: '1',
};

function slotsVacios(): Array<string | null> {
  return Array.from({ length: ML_PHOTO.maxSlots }, () => null);
}

interface UseProductFormParams {
  productId?: string;
  pendingPhoto?: { slotIndex: number; uri: string };
}

export function useProductForm({ productId, pendingPhoto }: UseProductFormParams) {
  const isEditing = !!productId;
  const { store } = useAuth();
  const {
    status: mlStatus,
    isConnected,
    planPermiteMl,
    connect: connectMl,
  } = useMercadoLibreConnection();

  const [form, setForm] = useState<ProductFormState>(INITIAL_FORM);
  const [photos, setPhotos] = useState<Array<string | null>>(slotsVacios);
  const [incluirMl, setIncluirMl] = useState(false);
  const [mlListingStatus, setMlListingStatus] = useState<MlListingStatus | undefined>();
  const [mlItemId, setMlItemId] = useState('');
  const [mlCategoryId, setMlCategoryId] = useState('');
  const [mlCategoryName, setMlCategoryName] = useState('');
  const [isMarkingPublished, setIsMarkingPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing || !productId) return;
    const load = async () => {
      try {
        const product = await productService.getById(productId);
        setForm({
          title: product.title,
          description: product.description ?? '',
          brand: product.brand,
          model: product.model,
          yearFrom: product.yearFrom?.toString() ?? '',
          yearTo: product.yearTo?.toString() ?? '',
          vehicleType: product.vehicleType ?? '',
          condition: product.condition,
          partNumber: product.partNumber ?? '',
          color: product.color ?? '',
          priceUsd: product.priceUsd.toString(),
          stock: product.stock.toString(),
          minStock: product.minStock.toString(),
        });
        const slots = slotsVacios();
        (product.photos ?? []).slice(0, ML_PHOTO.maxSlots).forEach((uri, i) => {
          slots[i] = uri;
        });
        setPhotos(slots);
        setIncluirMl(Boolean(product.mlPublishIntent));
        setMlListingStatus(product.mlListingStatus);
        setMlItemId(product.mlItemId ?? '');
        setMlCategoryId(product.mlCategoryId ?? '');
        setMlCategoryName(product.mlCategoryName ?? '');
      } catch {
        setLoadError('No se pudo cargar el producto.');
      } finally {
        setIsFetchingProduct(false);
      }
    };
    void load();
  }, [productId, isEditing]);

  useEffect(() => {
    if (!pendingPhoto) return;
    setPhotos((prev) => {
      const next = [...prev];
      next[pendingPhoto.slotIndex] = pendingPhoto.uri;
      return next;
    });
  }, [pendingPhoto]);

  const setField = useCallback(<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearPhotoSlot = useCallback((index: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  const listoMl = useMemo(() => {
    const price = parseFloat(form.priceUsd);
    return evaluarListoMl({
      title: form.title,
      partNumber: form.partNumber,
      description: form.description,
      priceUsd: isNaN(price) ? 0 : price,
      stock: parseInt(form.stock, 10) || 0,
      portadaUri: photos[0],
    });
  }, [form, photos]);

  const tituloSugerido = useMemo(
    () =>
      sugerirTituloMl({
        nombreProducto: form.title,
        brand: form.brand,
        model: form.model,
        yearFrom: form.yearFrom,
        yearTo: form.yearTo,
      }),
    [form.title, form.brand, form.model, form.yearFrom, form.yearTo],
  );

  const aplicarTituloSugerido = useCallback(() => {
    if (!tituloSugerido) return;
    setField('title', tituloSugerido);
  }, [tituloSugerido, setField]);

  const selectManualCategory = useCallback((category: MlManualCategory) => {
    setMlCategoryId(category.id);
    setMlCategoryName(category.name);
  }, []);

  const handleIncluirMl = useCallback((value: boolean) => {
    if (!value) {
      setIncluirMl(false);
      return;
    }

    if (ML_API_ENABLED) {
      if (!planPermiteMl) {
        Alert.alert(
          'Plan Pro',
          'Publicar en MercadoLibre entra en el plan Pro. Actualiza y conecta la cuenta en Mi tienda.',
        );
        return;
      }
      if (mlStatus === 'expired') {
        Alert.alert(
          'Sesión vencida',
          'La conexión con MercadoLibre caducó. En Mi tienda el dueño la vuelve a conectar.',
        );
        return;
      }
      if (!isConnected) {
        Alert.alert(
          'Conecta MercadoLibre',
          'La cuenta se conecta una sola vez en Mi tienda. Después este switch queda listo.',
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Conectar', onPress: () => { void connectMl(); } },
          ],
        );
        return;
      }
    }

    if (!listoMl.listo) {
      const pendientes = listoMl.items.filter((i) => !i.ok).map((i) => i.label);
      Alert.alert(
        'Falta un poco para ML',
        `MercadoLibre rechaza la publicación si esto no está:\n\n• ${pendientes.join('\n• ')}`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Marcar igual', onPress: () => setIncluirMl(true) },
        ],
      );
      return;
    }
    setIncluirMl(true);
  }, [listoMl, planPermiteMl, mlStatus, isConnected, connectMl]);

  const marcarPublicadoMl = useCallback(async (): Promise<ProductFormSaveResult> => {
    if (!isEditing || !productId || !store?.id) {
      return { success: false, title: 'Guarda primero', message: 'Crea el producto antes de marcarlo en ML.' };
    }
    setIsMarkingPublished(true);
    try {
      await mlListingService.markPublishedManual({
        productId,
        storeId: store.id,
        mlItemId: mlItemId.trim() || undefined,
      });
      setMlListingStatus('published_manual');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo marcar como publicado.';
      return { success: false, title: 'Error', message };
    } finally {
      setIsMarkingPublished(false);
    }
  }, [isEditing, productId, store?.id, mlItemId]);

  const handleSave = useCallback(async (): Promise<ProductFormSaveResult> => {
    if (!form.title.trim() || !form.brand.trim() || !form.model.trim() || !form.priceUsd.trim()) {
      return {
        success: false,
        title: 'Campos requeridos',
        message: 'Título, marca, modelo y precio son obligatorios.',
      };
    }
    if (!store?.id) {
      return {
        success: false,
        title: 'Sin tienda',
        message: 'No encontramos tu tienda. Cierra sesión e intenta de nuevo.',
      };
    }
    const price = parseFloat(form.priceUsd);
    if (isNaN(price) || price <= 0) {
      return {
        success: false,
        title: 'Precio inválido',
        message: 'Ingresa un precio válido mayor a 0.',
      };
    }

    setIsLoading(true);
    try {
      const urls: string[] = [];
      for (const uri of photos) {
        if (!uri) continue;
        if (productPhotoService.esUriLocal(uri)) {
          urls.push(await productPhotoService.subir(store.id, uri));
        } else {
          urls.push(uri);
        }
      }

      const payload = {
        storeId: store.id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        brand: form.brand.trim(),
        model: form.model.trim(),
        yearFrom: form.yearFrom ? parseInt(form.yearFrom, 10) : undefined,
        yearTo: form.yearTo ? parseInt(form.yearTo, 10) : undefined,
        vehicleType: form.vehicleType || undefined,
        condition: form.condition,
        partNumber: form.partNumber.trim() || undefined,
        color: form.color.trim() || undefined,
        priceUsd: price,
        stock: parseInt(form.stock, 10) || 0,
        minStock: parseInt(form.minStock, 10) || 1,
        photos: urls,
        mlPublishIntent: incluirMl,
      };

      let savedId = productId;
      if (isEditing && productId) {
        await productService.update(productId, payload);
      } else {
        const created = await productService.create(payload);
        savedId = created.id;
      }

      if (savedId && incluirMl) {
        if (!ML_API_ENABLED && mlCategoryId.trim()) {
          const cat = categoriaManualPorId(mlCategoryId.trim());
          const requiresColor = cat?.requiresColor ?? false;
          const mapped = mlCategoryService.mapManualAttributes(
            {
              partNumber: form.partNumber,
              brand: form.brand,
              model: form.model,
              condition: form.condition,
              color: form.color,
              title: form.title,
            },
            requiresColor,
          );
          await mlListingService.upsertManualCategory({
            productId: savedId,
            storeId: store.id,
            categoryId: mlCategoryId.trim(),
            categoryName: mlCategoryName.trim() || mlCategoryId.trim(),
            mapped: mapped.mapped,
            missingCount: mapped.missing.length,
          });
        } else {
          await mlListingService.upsertReadiness({
            productId: savedId,
            storeId: store.id,
            listo: listoMl.listo,
          });
        }
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar el producto.';
      return { success: false, title: 'Error', message };
    } finally {
      setIsLoading(false);
    }
  }, [form, photos, store?.id, isEditing, productId, incluirMl, listoMl.listo, mlCategoryId, mlCategoryName]);

  return {
    form,
    setField,
    photos,
    clearPhotoSlot,
    incluirMl,
    handleIncluirMl,
    listoMl,
    tituloSugerido,
    aplicarTituloSugerido,
    mlCategoryId,
    mlCategoryName,
    selectManualCategory,
    mlListingStatus,
    mlItemId,
    setMlItemId,
    marcarPublicadoMl,
    isMarkingPublished,
    mlStatus,
    isConnected,
    isLoading,
    isFetchingProduct,
    loadError,
    isEditing,
    handleSave,
  };
}
