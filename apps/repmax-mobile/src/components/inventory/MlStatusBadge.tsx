// Badge de estado MercadoLibre en inventario (modo puente E1).
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { ML_BADGE_CONFIG, type MlBadgeKind } from '../../utils/mlReadiness'
import { typography, borderRadius, spacing } from '../../utils/theme'

interface Props {
  kind: MlBadgeKind
  compact?: boolean
}

export function MlStatusBadge({ kind, compact }: Props) {
  if (kind === 'none') return null
  const cfg = ML_BADGE_CONFIG[kind]

  return (
    <View
      style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: cfg.bg }]}
      accessibilityLabel={cfg.label}
    >
      <Text style={[styles.text, { color: cfg.color }]} numberOfLines={1}>
        {cfg.label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  text: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.semibold,
  },
})
