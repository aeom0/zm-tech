// ============================================================
// Slots de foto estilo MercadoLibre (portada + 5 extras)
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ML_PHOTO, PHOTO_SLOT_LABELS } from '../../utils/mlPhotoRules';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';

interface PhotoSlotGridProps {
  uris: Array<string | null>;
  onPressSlot: (index: number) => void;
  onClearSlot?: (index: number) => void;
}

export function PhotoSlotGrid({ uris, onPressSlot, onClearSlot }: PhotoSlotGridProps) {
  const slots = Array.from({ length: ML_PHOTO.maxSlots }, (_, i) => uris[i] ?? null);

  return (
    <View>
      <Text style={styles.sectionLabel}>Fotos de la pieza</Text>
      <View style={styles.row}>
        {slots.map((uri, index) => {
          const esPortada = index === 0;
          return (
            <View key={PHOTO_SLOT_LABELS[index]} style={styles.slotWrap}>
              <TouchableOpacity
                style={[styles.slot, esPortada && styles.slotPortada]}
                onPress={() => onPressSlot(index)}
                accessibilityLabel={
                  uri
                    ? `Cambiar foto ${PHOTO_SLOT_LABELS[index]}`
                    : `Agregar foto ${PHOTO_SLOT_LABELS[index]}`
                }
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.thumb}
                    contentFit="cover"
                    recyclingKey={uri}
                  />
                ) : (
                  <Ionicons
                    name={index === ML_PHOTO.maxSlots - 1 ? 'add' : 'camera-outline'}
                    size={18}
                    color={esPortada ? colors.brand.orange : colors.brand.steel}
                  />
                )}
              </TouchableOpacity>
              {uri && onClearSlot ? (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => onClearSlot(index)}
                  hitSlop={8}
                  accessibilityLabel={`Quitar foto ${PHOTO_SLOT_LABELS[index]}`}
                >
                  <Ionicons name="close-circle" size={16} color={colors.semantic.error} />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.slotLabel} numberOfLines={1}>
                {PHOTO_SLOT_LABELS[index]}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.hint}>
        Se ven en el catálogo aunque no publiques en MercadoLibre. Fondo claro, pieza centrada, sin logo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  slotWrap: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  slot: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 64,
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotPortada: {
    borderWidth: 2,
    borderColor: colors.brand.orange,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  clearBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  slotLabel: {
    marginTop: 4,
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
  },
});
