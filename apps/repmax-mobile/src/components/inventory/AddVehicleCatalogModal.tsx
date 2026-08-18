// ============================================================
// Modal para agregar una marca/modelo/años nueva al catálogo de la
// tienda (repmax_vehicle_catalog) — queda disponible para toda la
// tienda, no solo para el producto en edición.
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';
import type { VehicleType } from '../../types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (entry: { brand: string; model: string; yearFrom?: number; yearTo?: number; vehicleType?: VehicleType }) => Promise<unknown>;
  initialBrand?: string;
}

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'CAR', label: 'Carro' },
  { value: 'MOTO', label: 'Moto' },
  { value: 'TRUCK', label: 'Camión' },
  { value: 'SUV', label: 'SUV' },
];

export function AddVehicleCatalogModal({ visible, onClose, onCreate, initialBrand }: Props) {
  const [brand, setBrand] = useState(initialBrand ?? '');
  const [model, setModel] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setBrand(initialBrand ?? '');
    setModel('');
    setYearFrom('');
    setYearTo('');
    setVehicleType('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!brand.trim() || !model.trim()) {
      Alert.alert('Campos requeridos', 'Marca y modelo son obligatorios.');
      return;
    }
    setIsSaving(true);
    try {
      await onCreate({
        brand: brand.trim(),
        model: model.trim(),
        yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
        yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
        vehicleType: vehicleType || undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo agregar al catálogo.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Agregar marca/modelo</Text>
            <TouchableOpacity onPress={handleClose} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            Queda guardado para toda la tienda, no solo para este producto.
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Marca *</Text>
            <TextInput
              style={styles.fieldInput}
              value={brand}
              onChangeText={setBrand}
              placeholder="Ej: Hyundai"
              placeholderTextColor={colors.text.disabled}
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Modelo *</Text>
            <TextInput
              style={styles.fieldInput}
              value={model}
              onChangeText={setModel}
              placeholder="Ej: Tucson"
              placeholderTextColor={colors.text.disabled}
              autoCapitalize="characters"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Año desde</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={yearFrom}
                  onChangeText={setYearFrom}
                  placeholder="2010"
                  placeholderTextColor={colors.text.disabled}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Año hasta</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={yearTo}
                  onChangeText={setYearTo}
                  placeholder="2024"
                  placeholderTextColor={colors.text.disabled}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Tipo de vehículo</Text>
            <View style={styles.chipsRow}>
              {VEHICLE_TYPES.map(vt => (
                <TouchableOpacity
                  key={vt.value}
                  style={[styles.chip, vehicleType === vt.value && styles.chipActive]}
                  onPress={() => setVehicleType(vehicleType === vt.value ? '' : vt.value)}
                >
                  <Text style={[styles.chipText, vehicleType === vt.value && styles.chipTextActive]}>
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.createBtn, isSaving && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.createBtnText}>Agregar al catálogo</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.size.lg,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.bold,
  },
  hint: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  fieldInput: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.elevated,
  },
  chipActive: {
    backgroundColor: colors.brand.orange,
    borderColor: colors.brand.orange,
  },
  chipText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
  },
  createBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
});
