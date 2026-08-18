// Checklist visual “Listo para ML” en la ficha de producto.
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { ItemChecklistMl } from '../../utils/mlReadiness'
import { colors, typography, spacing, borderRadius } from '../../utils/theme'

interface Props {
  items: ItemChecklistMl[]
  listo: boolean
}

export function MlReadinessChecklist({ items, listo }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {listo ? 'Listo para exportar a ML' : 'Checklist MercadoLibre'}
      </Text>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <Ionicons
            name={item.ok ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={item.ok ? colors.status.inStock : colors.text.disabled}
          />
          <Text style={[styles.label, !item.ok && styles.labelPending]}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  title: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  label: {
    flex: 1,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  labelPending: {
    color: colors.text.disabled,
  },
})
