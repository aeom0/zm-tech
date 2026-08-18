import React from 'react'
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import type { TenantConfig } from '@zmtech/tenant-config'
import { formatCurrency } from '@/utils/format'
import { Shadows } from '@/constants/theme'

import type { Service } from '../types'

interface ServiceCardProps {
  service: Service
  onPress: () => void
  onLongPress?: () => void
  onToggleActive?: () => void
  isToggling?: boolean
  theme: {
    backgroundDefault: string
    border: string
    text: string
    textMuted: string
    primary: string
    accent: string
  }
  config: TenantConfig
}

export function ServiceCard({
  service,
  onPress,
  onLongPress,
  onToggleActive,
  isToggling,
  theme,
  config,
}: ServiceCardProps) {
  const priceNum = parseFloat(service.price)
  const amount = Number.isFinite(priceNum) ? priceNum : 0

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: service.is_active ? 1 : 0.65,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.mainPress, { transform: [{ scale: pressed ? 0.99 : 1 }] }]}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <View style={styles.row}>
          <View style={styles.info}>
            <ThemedText style={styles.name}>{service.name}</ThemedText>
            <View style={styles.meta}>
              <Feather name="clock" size={12} color={theme.textMuted} />
              <ThemedText style={[styles.metaText, { color: theme.textMuted }]}>
                {service.duration} min
              </ThemedText>
              {!service.is_active && (
                <ThemedText style={[styles.inactiveBadge, { color: theme.textMuted }]}>
                  Inactivo
                </ThemedText>
              )}
            </View>
          </View>
          <ThemedText style={[styles.price, { color: theme.accent }]}>
            {formatCurrency(amount, config)}
          </ThemedText>
        </View>
      </Pressable>
      {onToggleActive && (
        <Pressable style={styles.toggleRow} onPress={onToggleActive} disabled={isToggling}>
          <ThemedText style={[styles.toggleLabel, { color: theme.textMuted }]}>Activo</ThemedText>
          {isToggling ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Feather
              name={service.is_active ? 'toggle-right' : 'toggle-left'}
              size={28}
              color={service.is_active ? theme.primary : theme.textMuted}
            />
          )}
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 8,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  mainPress: {
    padding: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
  },
  inactiveBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.25)',
  },
  toggleLabel: {
    fontSize: 13,
  },
})
