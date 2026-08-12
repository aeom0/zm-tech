// ============================================================
// RepMAX Business Suite — Formulario de Producto
// Crear o editar un producto del inventario.
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PhotoSlotGrid } from '../../components/inventory/PhotoSlotGrid';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import { productPhotoService } from '../../services/productPhotoService';
import { BRANDS } from '../../constants/brands';
import { ML_PHOTO } from '../../utils/mlPhotoRules';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';
import type { PartCondition, VehicleType } from '../../types/database';
import type { InventoryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<InventoryStackParamList, 'ProductForm'>;

interface FormState {
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

const INITIAL_FORM: FormState = {
  title: '', description: '', brand: '', model: '',
  yearFrom: '', yearTo: '', vehicleType: '',
  condition: 'NEW', partNumber: '',
  priceUsd: '', stock: '0', minStock: '1',
};

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'CAR', label: 'Carro' },
  { value: 'MOTO', label: 'Moto' },
  { value: 'TRUCK', label: 'Camión' },
  { value: 'SUV', label: 'SUV' },
];

function slotsVacios(): Array<string | null> {
  return Array.from({ length: ML_PHOTO.maxSlots }, () => null);
}

export default function ProductFormScreen({ route, navigation }: Props) {
  const { productId, pendingPhoto } = route.params ?? {};
  const isEditing = !!productId;
  const { store } = useAuth();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [photos, setPhotos] = useState<Array<string | null>>(slotsVacios);
  const [publicarMl, setPublicarMl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState(isEditing);
  const [showBrandPicker, setShowBrandPicker] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
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
        const existentes = product.photos ?? [];
        const slots = slotsVacios();
        existentes.slice(0, ML_PHOTO.maxSlots).forEach((uri, i) => {
          slots[i] = uri;
        });
        setPhotos(slots);
      } catch {
        Alert.alert('Error', 'No se pudo cargar el producto.');
        navigation.goBack();
      } finally {
        setIsFetchingProduct(false);
      }
    };
    load();
  }, [productId, isEditing, navigation]);

  useEffect(() => {
    if (!pendingPhoto) return;
    setPhotos((prev) => {
      const next = [...prev];
      next[pendingPhoto.slotIndex] = pendingPhoto.uri;
      return next;
    });
    navigation.setParams({ pendingPhoto: undefined });
  }, [pendingPhoto, navigation]);

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const huecosMl = (): string[] => {
    const huecos: string[] = [];
    if (!photos[0]) huecos.push('Foto de portada');
    if (!form.partNumber.trim()) huecos.push('Número de parte');
    if (!form.title.trim()) huecos.push('Título al estilo ML');
    return huecos;
  };

  const handlePublicarMl = (value: boolean) => {
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
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.brand.trim() || !form.model.trim() || !form.priceUsd.trim()) {
      Alert.alert('Campos requeridos', 'Título, marca, modelo y precio son obligatorios.');
      return;
    }
    if (!store?.id) {
      Alert.alert('Sin tienda', 'No encontramos tu tienda. Cierra sesión e intenta de nuevo.');
      return;
    }
    const price = parseFloat(form.priceUsd);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio válido mayor a 0.');
      return;
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

      if (isEditing) {
        await productService.update(productId, payload);
      } else {
        await productService.create(payload);
      }
      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el producto.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingProduct) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <FormSection title="Fotos">
          <PhotoSlotGrid
            uris={photos}
            onPressSlot={(index) => navigation.navigate('PhotoCapture', { slotIndex: index, productId })}
            onClearSlot={(index) => {
              setPhotos((prev) => {
                const next = [...prev];
                next[index] = null;
                return next;
              });
            }}
          />
        </FormSection>

        {/* Datos básicos */}
        <FormSection title="Datos del producto">
          <FormField
            label="Título *"
            value={form.title}
            onChangeText={v => setField('title', v)}
            placeholder="Filtro aceite Toyota Corolla 2015-20"
            hint="ML: Producto + Marca + compatible con… Sin stock ni precio."
          />
          <FormField
            label="Descripción"
            value={form.description}
            onChangeText={v => setField('description', v)}
            placeholder="Compatible, garantía, material. Sin teléfono ni WhatsApp."
            hint="Sin teléfono, WhatsApp ni URL."
            multiline
          />
          <FormField
            label="Número de parte"
            value={form.partNumber}
            onChangeText={v => setField('partNumber', v)}
            placeholder="Ej: 90915-YZZD2"
            hint="Atributo PART_NUMBER. Obligatorio para publicar en ML."
            autoCapitalize="characters"
          />
        </FormSection>

        {/* Marca y modelo */}
        <FormSection title="Vehículo compatible">
          <Text style={styles.label}>Marca *</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowBrandPicker(!showBrandPicker)}>
            <Text style={form.brand ? styles.inputText : styles.inputPlaceholder}>
              {form.brand || 'Seleccionar marca...'}
            </Text>
            <Ionicons name={showBrandPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.secondary} />
          </TouchableOpacity>
          {showBrandPicker && (
            <View style={styles.brandPicker}>
              <TextInput
                style={styles.brandSearch}
                placeholder="Buscar marca..."
                placeholderTextColor={colors.text.disabled}
                onChangeText={v => setField('brand', v)}
                value={form.brand}
                autoFocus
              />
              {BRANDS.filter(b => b.toLowerCase().includes(form.brand.toLowerCase())).map(brand => (
                <TouchableOpacity
                  key={brand}
                  style={styles.brandOption}
                  onPress={() => { setField('brand', brand); setShowBrandPicker(false); }}
                >
                  <Text style={styles.brandOptionText}>{brand}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <FormField label="Modelo *" value={form.model} onChangeText={v => setField('model', v)} placeholder="Ej: Corolla" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Año desde" value={form.yearFrom} onChangeText={v => setField('yearFrom', v)} placeholder="2010" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Año hasta" value={form.yearTo} onChangeText={v => setField('yearTo', v)} placeholder="2024" keyboardType="numeric" />
            </View>
          </View>

          <Text style={styles.label}>Tipo de vehículo</Text>
          <View style={styles.optionsRow}>
            {VEHICLE_TYPES.map(vt => (
              <TouchableOpacity
                key={vt.value}
                style={[styles.optionChip, form.vehicleType === vt.value && styles.optionChipActive]}
                onPress={() => setField('vehicleType', form.vehicleType === vt.value ? '' : vt.value)}
              >
                <Text style={[styles.optionChipText, form.vehicleType === vt.value && styles.optionChipTextActive]}>
                  {vt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormSection>

        {/* Condición */}
        <FormSection title="Condición">
          <View style={styles.optionsRow}>
            {(['NEW', 'USED'] as PartCondition[]).map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.optionChip, form.condition === c && styles.optionChipActive]}
                onPress={() => setField('condition', c)}
              >
                <Text style={[styles.optionChipText, form.condition === c && styles.optionChipTextActive]}>
                  {c === 'NEW' ? '✓ Nuevo' : '~ Usado'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormSection>

        {/* Precio y stock */}
        <FormSection title="Precio y stock">
          <FormField label="Precio USD *" value={form.priceUsd} onChangeText={v => setField('priceUsd', v)} placeholder="0.00" keyboardType="decimal-pad" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Stock actual" value={form.stock} onChangeText={v => setField('stock', v)} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Stock mínimo" value={form.minStock} onChangeText={v => setField('minStock', v)} placeholder="1" keyboardType="numeric" />
            </View>
          </View>
        </FormSection>

        <View style={styles.mlRow}>
          <View style={styles.mlCopy}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.brand.orange} />
            <Text style={styles.mlLabel}>Publicar en MercadoLibre</Text>
          </View>
          <Switch
            value={publicarMl}
            onValueChange={handlePublicarMl}
            trackColor={{ false: colors.bg.border, true: colors.brand.orange }}
            thumbColor={colors.text.primary}
          />
        </View>
      </ScrollView>

      {/* Botón guardar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={20} color={colors.text.inverse} />
              <Text style={styles.saveBtnText}>{isEditing ? 'Guardar cambios' : 'Crear producto'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Sub-componentes ─────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, hint, multiline, keyboardType, autoCapitalize }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.textInput, multiline && styles.textInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.disabled}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.base, paddingBottom: spacing.xl },
  section: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  textInputMultiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  input: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
  },
  inputPlaceholder: {
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
  },
  brandPicker: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    marginTop: spacing.xs,
    maxHeight: 200,
  },
  brandSearch: {
    padding: spacing.sm,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  brandOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  brandOptionText: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  optionChipActive: {
    backgroundColor: colors.brand.orange,
    borderColor: colors.brand.orange,
  },
  optionChipText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
  optionChipTextActive: {
    color: colors.text.inverse,
  },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
    backgroundColor: colors.bg.secondary,
  },
  saveBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
  },
  mlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  mlCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.md,
  },
  mlLabel: {
    flex: 1,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
});
