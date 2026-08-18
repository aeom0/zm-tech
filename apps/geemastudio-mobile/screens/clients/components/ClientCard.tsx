import React from 'react'
import { View, StyleSheet, Pressable } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { ClientWithMetrics, ClientSegment } from '../types'
import { useTenant } from '@/contexts/TenantContext'
import { formatCurrency } from '@/utils/format'

interface Props {
  client: ClientWithMetrics
  segment: ClientSegment
  onPress: () => void
}

function getSegmentForClient(client: ClientWithMetrics): ClientSegment {
  const vipVisitsThreshold = 5
  const days = client.days_since_last_visit ?? Infinity

  if (client.total_visits >= vipVisitsThreshold || client.total_spent >= 5 * 50) {
    return 'vip'
  }
  if (client.total_visits >= 2 && client.total_visits < vipVisitsThreshold) {
    return 'regular'
  }
  if (days > 45) {
    return 'at_risk'
  }
  if (client.total_visits > 0 && days <= 30) {
    return 'new'
  }
  return 'all'
}

export function ClientCard({ client, segment, onPress }: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()

  const derivedSegment = getSegmentForClient(client)

  const badge =
    derivedSegment === 'vip'
      ? { label: 'VIP', color: theme.accent }
      : derivedSegment === 'at_risk'
        ? { label: 'En riesgo', color: theme.warning }
        : derivedSegment === 'new'
          ? { label: 'Nuevo', color: theme.success }
          : null

  const lastVisitLabel = client.last_visit_date
    ? new Date(client.last_visit_date).toLocaleDateString(config.locale.language, {
        day: 'numeric',
        month: 'short',
      })
    : 'Sin visitas'

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: `${theme.primary}18` }]}>
        <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
          {client.name.charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.info}>
        <View style={styles.topRow}>
          <ThemedText style={[styles.name, { color: theme.text }]}>{client.name}</ThemedText>
          {badge && (
            <View style={[styles.badge, { backgroundColor: `${badge.color}18` }]}>
              <ThemedText style={[styles.badgeText, { color: badge.color }]}>
                {badge.label}
              </ThemedText>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <ThemedText style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
            Última visita: {lastVisitLabel}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
            Visitas: {client.total_visits}
          </ThemedText>
        </View>
        <View style={styles.bottomRow}>
          <ThemedText style={[styles.amount, { color: theme.gold }]}>
            {formatCurrency(client.total_spent, config)}
          </ThemedText>
          {client.phone ? (
            <ThemedText style={[styles.phone, { color: theme.textMuted }]} numberOfLines={1}>
              {client.phone}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  meta: {
    fontSize: 11,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  phone: {
    fontSize: 11,
  },
})
