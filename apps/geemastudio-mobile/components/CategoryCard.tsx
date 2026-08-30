import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useHaptics } from '@/hooks/useHaptics'
import { Spacing, BorderRadius } from '@/constants/theme'

export interface CategoryCardProps {
  icon: keyof typeof Feather.glyphMap
  label: string
  onPress: () => void
  badgeCount?: number
}

export function CategoryCard({ icon, label, onPress, badgeCount }: CategoryCardProps) {
  const { theme } = useTheme()
  const haptics = useHaptics()

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={() => {
        haptics.light()
        onPress()
      }}
    >
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.badgeText}>{badgeCount}</ThemedText>
        </View>
      )}
      <View style={[styles.iconWrap, { backgroundColor: `${theme.primary}18` }]}>
        <Feather name={icon} size={26} color={theme.primary} />
      </View>
      <ThemedText style={[styles.label, { color: theme.text }]} numberOfLines={2}>
        {label}
      </ThemedText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    minWidth: 20,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
})
