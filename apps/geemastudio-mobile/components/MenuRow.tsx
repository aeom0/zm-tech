import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useHaptics } from '@/hooks/useHaptics'
import { Spacing, BorderRadius } from '@/constants/theme'

export interface MenuRowProps {
  icon: keyof typeof Feather.glyphMap
  label: string
  onPress: () => void
  isDestructive?: boolean
  badgeCount?: number
  rightElement?: React.ReactNode
}

export function MenuRow({
  icon,
  label,
  onPress,
  isDestructive = false,
  badgeCount,
  rightElement,
}: MenuRowProps) {
  const { theme } = useTheme()
  const haptics = useHaptics()
  const iconColor = isDestructive ? theme.error : theme.primary

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuRow,
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
      <View style={[styles.menuIconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.menuLabelContainer}>
        <ThemedText style={[styles.menuLabel, { color: theme.text }]}>{label}</ThemedText>
        {typeof badgeCount === 'number' && badgeCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.badgeText}>{badgeCount}</ThemedText>
          </View>
        )}
      </View>
      {rightElement ?? <Feather name="chevron-right" size={20} color={theme.textMuted} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLabel: { fontSize: 16, fontWeight: '500' },
  badge: {
    minWidth: 20,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
})
