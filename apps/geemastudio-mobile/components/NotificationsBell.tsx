import React, { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { Spacing, BorderRadius, Colors } from '@/constants/theme'

interface NotificationItem {
  key: string
  icon: keyof typeof Feather.glyphMap
  title: string
  description: string
  count: number
  onPress?: () => void
}

interface NotificationsBellProps {
  items: NotificationItem[]
  theme: {
    text: string
    textSecondary: string
    card: string
    border: string
    primary: string
  }
}

export function NotificationsBell({ items, theme }: NotificationsBellProps) {
  const [visible, setVisible] = useState(false)
  const { width } = useWindowDimensions()
  const panelWidth = Math.min(320, width - Spacing.lg * 2)
  const totalCount = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={12}
        style={styles.trigger}
        accessibilityLabel="Notificaciones"
      >
        <Feather name="bell" size={22} color={theme.text} />
        {totalCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{totalCount > 9 ? '9+' : totalCount}</Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable
            style={[
              styles.panel,
              { width: panelWidth, backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.panelTitle, { color: theme.text }]}>Notificaciones</Text>
            {items.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Sin pendientes por ahora.
              </Text>
            ) : (
              items.map((item) => (
                <Pressable
                  key={item.key}
                  style={styles.row}
                  disabled={!item.onPress}
                  onPress={() => {
                    setVisible(false)
                    item.onPress?.()
                  }}
                >
                  <View style={[styles.rowIcon, { backgroundColor: `${theme.primary}1A` }]}>
                    <Feather name={item.icon} size={18} color={theme.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <View style={styles.rowHeader}>
                      <Text style={[styles.rowTitle, { color: theme.text }]}>{item.title}</Text>
                      {item.count > 0 && (
                        <View style={[styles.rowCount, { backgroundColor: theme.primary }]}>
                          <Text style={styles.rowCountText}>{item.count}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.rowDescription, { color: theme.textSecondary }]}>
                      {item.description}
                    </Text>
                  </View>
                  {item.onPress ? (
                    <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                  ) : null}
                </Pressable>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    marginRight: Spacing.lg,
    padding: Spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.light.buttonText,
    fontSize: 9,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: Spacing.md,
  },
  panel: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowCount: {
    minWidth: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  rowCountText: {
    color: Colors.light.buttonText,
    fontSize: 10,
    fontWeight: '700',
  },
  rowDescription: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
})
