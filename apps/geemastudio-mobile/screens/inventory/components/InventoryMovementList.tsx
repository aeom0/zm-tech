import { Text, View } from 'react-native'

import { Spacing } from '@/constants/theme'

import { inventoryStyles as styles } from '../inventoryStyles'
import type { InventoryItem, InventoryMovement } from '../types'

interface InventoryMovementListProps {
  movements: InventoryMovement[]
  items: InventoryItem[]
  theme: {
    backgroundSecondary: string
    border: string
    text: string
    textMuted: string
    success: string
    error: string
  }
}

function formatMovementDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function InventoryMovementList({ movements, items, theme }: InventoryMovementListProps) {
  if (movements.length === 0) return null

  const itemNames = new Map(items.map((item) => [item.id, item.name]))

  return (
    <View style={{ marginTop: Spacing.xl }}>
      <Text style={[styles.movementTitle, { color: theme.text }]}>Últimos movimientos</Text>
      <View
        style={[
          styles.movementCard,
          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        ]}
      >
        {movements.map((movement) => {
          const isIncrease = movement.delta > 0
          return (
            <View key={movement.id} style={styles.movementRow}>
              <View style={styles.movementInfo}>
                <Text style={[styles.movementItemName, { color: theme.text }]} numberOfLines={1}>
                  {(movement.item_id ? itemNames.get(movement.item_id) : undefined) ??
                    'Producto eliminado'}
                </Text>
                <Text style={[styles.movementDate, { color: theme.textMuted }]}>
                  {formatMovementDate(movement.created_at)} · {movement.quantity_before} →{' '}
                  {movement.quantity_after}
                </Text>
              </View>
              <Text
                style={[styles.movementDelta, { color: isIncrease ? theme.success : theme.error }]}
              >
                {isIncrease ? '+' : ''}
                {movement.delta}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
