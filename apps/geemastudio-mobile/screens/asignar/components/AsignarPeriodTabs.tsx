import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'
import type { AsignarPeriod } from '../types'

interface AsignarPeriodTabsProps {
  period: AsignarPeriod
  onChange: (period: AsignarPeriod) => void
}

const TABS: { id: AsignarPeriod; label: string }[] = [
  { id: 'upcoming', label: 'Próximos 7 días' },
  { id: 'past', label: 'Últimos 7 días' },
]

export function AsignarPeriodTabs({ period, onChange }: AsignarPeriodTabsProps) {
  const { theme } = useTheme()

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSecondary }]}>
      {TABS.map((tab) => {
        const isActive = period === tab.id
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, isActive && { backgroundColor: theme.primary }]}
          >
            <ThemedText
              style={[styles.tabText, { color: isActive ? Colors.light.buttonText : theme.textSecondary }]}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 3,
    gap: Spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
