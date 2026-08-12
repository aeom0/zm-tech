// ============================================================
// Estado y persistencia del formulario de producto (fotos + ficha)
// El screen decide navegación / Alert; este hook no toca React Navigation.
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { productPhotoService } from '../services/productPhotoService';
import { productService } from '../services/productService';
import { ML_PHOTO } from '../utils/mlPhotoRules';
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
  condition: 'NEW', partNumber: '',
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

  const [form, setForm] = useState<ProductFormState>(INITIAL_FORM);
  const [photos, setPhotos] = useState<Array<string | null>>(slotsVacios);
  const [publicarMl, setPublicarMl] = useState(false);
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
          priceUsd: product.priceUsd.toString(),
          stock: product.stock.toString(),
          minStock: product.minStock.toString(),
        });
        const slots = slotsVacios();
        (product.photos ?? []).slice(0, ML_PHOTO.maxSlots).forEach((uri, i) => {
          slots[i] = uri;
        });
        setPhotos(slots);
        setPublicarMl(Boolean(product.mlPublishIntent));
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

  const setPhotoSlot = useCallback((index: number, uri: string) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = uri;
      return next;
    });
  }, []);

  const clearPhotoSlot = useCallback((index: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  const huecosMl = useCallback((): string[] => {
    const huecos: string[] = [];
    if (!photos[0]) huecos.push('Foto de portada');
    if (!form.partNumber.trim()) huecos.push('Número de parte');
    if (!form.title.trim()) huecos.push('Título al estilo ML');
    return huecos;
  }, [photos, form.partNumber, form.title]);

  // TODO(ml-oauth): el switch solo vive en estado local. Cuando conectemos ML:
  // 1) Persistir `publicarMl` en `repmax_products.ml_publish_intent` (migración SQL + schema TS)
  //    para que sobreviva a cerrar/reabrir la ficha.
  // 2) OAuth de la tienda es un solo "conectar cuenta ML" en Configuración/Más — no por producto.
  // 3) Si activa el switch, guarda, y la tienda nunca conectó OAuth: dejar en cola
  //    (`Pendiente`) y avisar en el dashboard; no publicar a ciegas.
  const handlePublicarMl = useCallback((value: boolean) => {
    if (!value) {
      setPublicarMl(false);
      return;
    }
    const huecos = huecosMl();
    if (huecos.length > 0) {
      Alert.alert(
        'Falta un poco para publicar',
        `MercadoLibre rechaza la publicación si esto no está:\n\n• ${huecos.join('\n• ')}\n\nCuadramos la ficha y listo. La conexión OAuth llega en el siguiente paso.`,
      );
      return;
    }
    Alert.alert(
      'Conexión MercadoLibre',
      'La ficha está lista. Conectar la cuenta ML y publicar sale en el siguiente paso — por ahora se guarda en RepMAX.',
    );
    setPublicarMl(true);
  }, [huecosMl]);

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
        priceUsd: price,
        stock: parseInt(form.stock, 10) || 0,
        minStock: parseInt(form.minStock, 10) || 1,
        photos: urls,
      };

      if (isEditing && productId) {
        await productService.update(productId, payload);
      } else {
        await productService.create(payload);
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar el producto.';
      return { success: false, title: 'Error', message };
    } finally {
      setIsLoading(false);
    }
  }, [form, photos, store?.id, isEditing, productId]);

  return {
    form,
    setField,
    photos,
    setPhotoSlot,
    clearPhotoSlot,
    publicarMl,
    handlePublicarMl,
    isLoading,
    isFetchingProduct,
    loadError,
    isEditing,
    handleSave,
  };
}
