import React from 'react'
import { View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'

import { inventoryStyles as styles } from '../inventoryStyles'

interface InventoryEmptyStateProps {
  categoryLabel: string
  theme: {
    textSecondary: string
    textMuted: string
  }
}

export function InventoryEmptyState({ categoryLabel, theme }: InventoryEmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Feather name="package" size={28} color={theme.textMuted} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
        Inventario vacío
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textMuted }]}>
        Agrega ítems de {categoryLabel.toLowerCase()}
      </ThemedText>
    </View>
  )
}
