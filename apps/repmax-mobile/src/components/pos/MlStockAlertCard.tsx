// Alerta post-venta: productos en ML que requieren actualizar stock manualmente.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius } from '../../utils/theme';

import type { ItemAlertaMlStock } from '../../utils/mlStockAlert';

interface Props {
  items: ItemAlertaMlStock[];
}

export function MlStockAlertCard({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="warning-outline" size={20} color={colors.semantic.warning} />
        <Text style={styles.title}>Actualiza stock en MercadoLibre</Text>
      </View>
      <Text style={styles.hint}>
        Vendiste en mostrador piezas que también están en ML. El stock no baja automático — entra a
        ML y ajusta la cantidad.
      </Text>
      {items.map((item) => (
        <View key={item.productId} style={styles.row}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
          {item.partNumber ? (
            <Text style={styles.meta}>Ref: {item.partNumber}</Text>
          ) : null}
          {item.mlItemId ? (
            <Text style={styles.meta}>ML: {item.mlItemId}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.semantic.warning + '18',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.semantic.warning + '55',
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.semantic.warning,
  },
  hint: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.semantic.warning + '40',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  productTitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  meta: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
    marginTop: 2,
  },
});
