// ============================================================
// RepMAX Business Suite — Formulario de Producto
// Crear o editar un producto del inventario.
// ============================================================
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { PhotoSlotGrid } from '../../components/inventory/PhotoSlotGrid'
import { MlReadinessChecklist } from '../../components/inventory/MlReadinessChecklist'
import { MlCategoryManualSection } from '../../components/inventory/MlCategoryManualSection'
import { useProductForm } from '../../hooks/useProductForm'
import { ML_API_ENABLED, ML_MANUAL_MODE_HINT } from '../../constants/mlConfig'
import { BRANDS } from '../../constants/brands'
import { colors, typography, spacing, borderRadius } from '../../utils/theme'
import type { PartCondition, VehicleType } from '../../types/database'
import type { InventoryStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InventoryStackParamList, 'ProductForm'>

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'CAR', label: 'Carro' },
  { value: 'MOTO', label: 'Moto' },
  { value: 'TRUCK', label: 'Camión' },
  { value: 'SUV', label: 'SUV' },
]

export default function ProductFormScreen({ route, navigation }: Props) {
  const { productId, pendingPhoto, scannedBarcode } = route.params ?? {}
  const {
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
  } = useProductForm({ productId, pendingPhoto, scannedBarcode })
  const [showBrandPicker, setShowBrandPicker] = useState(false)

  useEffect(() => {
    if (!loadError) return
    Alert.alert('Error', loadError)
    navigation.goBack()
  }, [loadError, navigation])

  useEffect(() => {
    if (!pendingPhoto) return
    navigation.setParams({ pendingPhoto: undefined })
  }, [pendingPhoto, navigation])

  useEffect(() => {
    if (!scannedBarcode) return
    navigation.setParams({ scannedBarcode: undefined })
  }, [scannedBarcode, navigation])

  const onSave = async () => {
    const result = await handleSave()
    if (result.success) {
      navigation.goBack()
      return
    }
    Alert.alert(result.title, result.message)
  }

  if (isFetchingProduct) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand.orange} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormSection title="Fotos">
          <PhotoSlotGrid
            uris={photos}
            onPressSlot={(index) =>
              navigation.navigate('PhotoCapture', { slotIndex: index, productId })
            }
            onClearSlot={clearPhotoSlot}
          />
        </FormSection>

        {/* Datos básicos */}
        <FormSection title="Datos del producto">
          <FormField
            label="Título *"
            value={form.title}
            onChangeText={(v) => setField('title', v)}
            placeholder="Filtro aceite Toyota Corolla 2015-20"
            hint="ML: Producto + Marca + compatible con… Sin stock ni precio."
          />
          {tituloSugerido && tituloSugerido !== form.title.trim() ? (
            <TouchableOpacity
              style={styles.suggestBtn}
              onPress={aplicarTituloSugerido}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.brand.orange} />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestLabel}>Título sugerido para ML</Text>
                <Text style={styles.suggestText} numberOfLines={2}>
                  {tituloSugerido}
                </Text>
              </View>
              <Text style={styles.suggestAction}>Usar</Text>
            </TouchableOpacity>
          ) : null}
          <FormField
            label="Descripción"
            value={form.description}
            onChangeText={(v) => setField('description', v)}
            placeholder="Compatible, garantía, material. Sin teléfono ni WhatsApp."
            hint="Sin teléfono, WhatsApp ni URL."
            multiline
          />
          <FormField
            label="Número de parte"
            value={form.partNumber}
            onChangeText={(v) => setField('partNumber', v)}
            placeholder="Ej: 90915-YZZD2"
            hint="Atributo PART_NUMBER. Obligatorio para publicar en ML."
            autoCapitalize="characters"
          />
          <Text style={styles.label}>Código de barras / QR</Text>
          <View style={styles.barcodeRow}>
            <TextInput
              style={[styles.textInput, styles.barcodeInput]}
              value={form.barcode}
              onChangeText={(v) => setField('barcode', v)}
              placeholder="EAN, Code128 o payload QR"
              placeholderTextColor={colors.text.disabled}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.barcodeScanBtn}
              onPress={() => navigation.navigate('ScanCode', { modo: 'asignar' })}
              accessibilityLabel="Escanear código para este producto"
            >
              <Ionicons name="barcode-outline" size={22} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Único por tienda. Sirve para vender y para cargar stock.</Text>
        </FormSection>

        {/* Marca y modelo */}
        <FormSection title="Vehículo compatible">
          <Text style={styles.label}>Marca *</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowBrandPicker(!showBrandPicker)}
          >
            <Text style={form.brand ? styles.inputText : styles.inputPlaceholder}>
              {form.brand || 'Seleccionar marca...'}
            </Text>
            <Ionicons
              name={showBrandPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
          {showBrandPicker && (
            <View style={styles.brandPicker}>
              <TextInput
                style={styles.brandSearch}
                placeholder="Buscar marca..."
                placeholderTextColor={colors.text.disabled}
                onChangeText={(v) => setField('brand', v)}
                value={form.brand}
                autoFocus
              />
              {BRANDS.filter((b) => b.toLowerCase().includes(form.brand.toLowerCase())).map(
                (brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={styles.brandOption}
                    onPress={() => {
                      setField('brand', brand)
                      setShowBrandPicker(false)
                    }}
                  >
                    <Text style={styles.brandOptionText}>{brand}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}

          <FormField
            label="Modelo *"
            value={form.model}
            onChangeText={(v) => setField('model', v)}
            placeholder="Ej: Corolla"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField
                label="Año desde"
                value={form.yearFrom}
                onChangeText={(v) => setField('yearFrom', v)}
                placeholder="2010"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label="Año hasta"
                value={form.yearTo}
                onChangeText={(v) => setField('yearTo', v)}
                placeholder="2024"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.label}>Tipo de vehículo</Text>
          <View style={styles.optionsRow}>
            {VEHICLE_TYPES.map((vt) => (
              <TouchableOpacity
                key={vt.value}
                style={[
                  styles.optionChip,
                  form.vehicleType === vt.value && styles.optionChipActive,
                ]}
                onPress={() =>
                  setField('vehicleType', form.vehicleType === vt.value ? '' : vt.value)
                }
              >
                <Text
                  style={[
                    styles.optionChipText,
                    form.vehicleType === vt.value && styles.optionChipTextActive,
                  ]}
                >
                  {vt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormSection>

        {/* Condición */}
        <FormSection title="Condición">
          <View style={styles.optionsRow}>
            {(['NEW', 'USED'] as PartCondition[]).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.optionChip, form.condition === c && styles.optionChipActive]}
                onPress={() => setField('condition', c)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    form.condition === c && styles.optionChipTextActive,
                  ]}
                >
                  {c === 'NEW' ? '✓ Nuevo' : '~ Usado'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormSection>

        {/* Precio y stock */}
        <FormSection title="Precio y stock">
          <FormField
            label="Precio USD *"
            value={form.priceUsd}
            onChangeText={(v) => setField('priceUsd', v)}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField
                label="Stock actual"
                value={form.stock}
                onChangeText={(v) => setField('stock', v)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label="Stock mínimo"
                value={form.minStock}
                onChangeText={(v) => setField('minStock', v)}
                placeholder="1"
                keyboardType="numeric"
              />
            </View>
          </View>
        </FormSection>

        <View style={styles.mlRow}>
          <View style={styles.mlCopy}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.brand.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mlLabel}>
                {ML_API_ENABLED ? 'Publicar en MercadoLibre' : 'Incluir en catálogo ML'}
              </Text>
              <Text style={styles.hint}>
                {ML_API_ENABLED
                  ? mlStatus === 'connecting'
                    ? 'Abriendo MercadoLibre…'
                    : isConnected
                      ? 'Cuenta conectada — el switch queda listo'
                      : mlStatus === 'expired'
                        ? 'Sesión vencida — reconecta en Mi tienda'
                        : 'Conecta la cuenta en Mi tienda'
                  : ML_MANUAL_MODE_HINT}
              </Text>
            </View>
          </View>
          <Switch
            value={incluirMl}
            onValueChange={handleIncluirMl}
            trackColor={{ false: colors.bg.border, true: colors.brand.orange }}
            thumbColor={colors.text.primary}
          />
        </View>
        {incluirMl ? <MlReadinessChecklist items={listoMl.items} listo={listoMl.listo} /> : null}

        {incluirMl && !ML_API_ENABLED ? (
          <MlCategoryManualSection
            categoryId={mlCategoryId}
            categoryName={mlCategoryName}
            color={form.color}
            onSelectCategory={selectManualCategory}
            onColorChange={(v) => setField('color', v)}
          />
        ) : null}

        {incluirMl &&
        isEditing &&
        (mlListingStatus === 'exported' || mlListingStatus === 'published_manual') ? (
          <FormSection title="Publicación manual en ML">
            <Text style={styles.hint}>
              {mlListingStatus === 'exported'
                ? 'Ya exportaste este producto. Cuando lo subas en MercadoLibre, confirma aquí.'
                : 'Producto marcado como publicado en MercadoLibre.'}
            </Text>
            <FormField
              label="ID o URL en ML (opcional)"
              value={mlItemId}
              onChangeText={setMlItemId}
              placeholder="Ej: MLA123456789 o link de la publicación"
              autoCapitalize="none"
            />
            {mlListingStatus === 'exported' ? (
              <TouchableOpacity
                style={[styles.mlPublishedBtn, isMarkingPublished && styles.saveBtnDisabled]}
                onPress={() => {
                  void marcarPublicadoMl().then((result) => {
                    if (result.success) {
                      Alert.alert('Listo', 'Marcamos el producto como publicado en ML.')
                    } else {
                      Alert.alert(result.title, result.message)
                    }
                  })
                }}
                disabled={isMarkingPublished}
                activeOpacity={0.85}
              >
                {isMarkingPublished ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <Text style={styles.mlPublishedBtnText}>Ya publiqué en MercadoLibre</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </FormSection>
        ) : null}
      </ScrollView>

      {/* Botón guardar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
          onPress={() => void onSave()}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons
                name={isEditing ? 'save-outline' : 'add-circle-outline'}
                size={20}
                color={colors.text.inverse}
              />
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Guardar cambios' : 'Crear producto'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Sub-componentes ─────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  hint?: string
  multiline?: boolean
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
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
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.primary,
  },
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
  mlPublishedBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  mlPublishedBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.orange + '14',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.brand.orange + '44',
    padding: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  suggestLabel: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.brand.orange,
  },
  suggestText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    marginTop: 2,
  },
  suggestAction: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.brand.orange,
  },
  saveBtnDisabled: { opacity: 0.6 },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barcodeInput: {
    flex: 1,
  },
  barcodeScanBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
})
