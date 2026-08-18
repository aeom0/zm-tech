import React from 'react'
import { View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'

import { CATEGORY_LABELS } from '../constants'
import type { InventoryCategory } from '../types'
import { inventoryStyles as styles } from '../inventoryStyles'

interface InventoryEmptyStateProps {
  selectedTab: InventoryCategory
  theme: {
    textSecondary: string
    textMuted: string
  }
}

export function InventoryEmptyState({ selectedTab, theme }: InventoryEmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Feather name="package" size={28} color={theme.textMuted} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
        Inventario vacío
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textMuted }]}>
        Agrega ítems de {CATEGORY_LABELS[selectedTab].toLowerCase()}
      </ThemedText>
    </View>
  )
}
