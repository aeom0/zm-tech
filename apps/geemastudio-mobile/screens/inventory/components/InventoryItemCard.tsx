import React from 'react'
import { Pressable, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/theme'

import type { InventoryItem } from '../types'
import { inventoryStyles as styles } from '../inventoryStyles'

interface InventoryItemCardProps {
  item: InventoryItem
  theme: {
    backgroundDefault: string
    border: string
    text: string
    textMuted: string
  }
  onPress: () => void
  onLongPress: () => void
  onDecrement: () => void
  onIncrement: () => void
}

export function InventoryItemCard({
  item,
  theme,
  onPress,
  onLongPress,
  onDecrement,
  onIncrement,
}: InventoryItemCardProps) {
  const isLowStock = item.quantity <= item.min_stock

  return (
    <Pressable
      style={({ pressed }) => [
        styles.itemCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: isLowStock ? Colors.light.warning : theme.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <ThemedText style={styles.itemName}>{item.name}</ThemedText>
          {isLowStock && (
            <View style={[styles.warningBadge, { backgroundColor: Colors.light.warning + '20' }]}>
              <Feather name="alert-triangle" size={12} color={Colors.light.warning} />
            </View>
          )}
        </View>
        <ThemedText style={[styles.itemUnit, { color: theme.textMuted }]}>{item.unit}</ThemedText>
      </View>

      <View style={styles.quantityControls}>
        <Pressable
          style={[styles.quantityButton, { borderColor: theme.border }]}
          onPress={onDecrement}
        >
          <Feather name="minus" size={18} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.quantityText, isLowStock && { color: Colors.light.warning }]}>
          {item.quantity}
        </ThemedText>
        <Pressable
          style={[styles.quantityButton, { borderColor: theme.border }]}
          onPress={onIncrement}
        >
          <Feather name="plus" size={18} color={theme.text} />
        </Pressable>
      </View>
    </Pressable>
  )
}
