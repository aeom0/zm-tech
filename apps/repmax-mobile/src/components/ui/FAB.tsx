// ============================================================
// FAB circular y barra de acción inferior (carrito POS)
// ============================================================
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { colors, typography, spacing, borderRadius, shadows, layout } from '../../utils/theme'
import { hapticLight } from '../../utils/haptics'

interface FABProps {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
}

/** Botón flotante circular (Inventario, Clientes) */
export function FAB({ icon, onPress, accessibilityLabel, style }: FABProps) {
  return (
    <TouchableOpacity
      style={[styles.fab, style]}
      onPress={() => {
        void hapticLight()
        onPress()
      }}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={26} color={colors.text.inverse} />
    </TouchableOpacity>
  )
}

interface ActionBarProps {
  label: string
  icon?: keyof typeof Ionicons.glyphMap
  badge?: number
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

/** Barra full-width inferior (ej. Ver carrito en POS) */
export function ActionBar({ label, icon = 'cart', badge, onPress, style }: ActionBarProps) {
  return (
    <TouchableOpacity
      style={[styles.actionBar, style]}
      onPress={() => {
        void hapticLight()
        onPress()
      }}
      activeOpacity={0.9}
    >
      <Ionicons name={icon} size={22} color={colors.text.inverse} />
      <Text style={styles.actionBarText}>{label}</Text>
      {badge != null && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.base,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.full,
    width: layout.fabSize,
    height: layout.fabSize,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  actionBar: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.base,
    right: spacing.base,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  actionBarText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
  badge: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
  },
})
