import React, { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from '@react-navigation/elements'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'

import { ServicesTab } from './services/components/ServicesTab'
import { PacksTab } from './services/components/PacksTab'
import { PromosTab } from './services/components/PromosTab'

const TABS = ['Servicios', 'Packs', 'Promos'] as const

export default function ServicesScreen() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const { theme } = useTheme()
  const [tab, setTab] = useState(0)

  return (
    <View
      style={[styles.root, { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom }]}
    >
      <View
        style={[
          styles.tabBar,
          {
            paddingTop: headerHeight + Spacing.sm,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {TABS.map((label, i) => {
          const active = tab === i
          return (
            <Pressable
              key={label}
              style={[
                styles.tabPill,
                { borderColor: theme.border },
                active && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => setTab(i)}
            >
              <ThemedText style={[styles.tabLabel, { color: active ? '#FFFFFF' : theme.text }]}>
                {label}
              </ThemedText>
            </Pressable>
          )
        })}
      </View>

      {tab === 0 && <ServicesTab />}
      {tab === 1 && <PacksTab />}
      {tab === 2 && <PromosTab />}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabPill: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
})
