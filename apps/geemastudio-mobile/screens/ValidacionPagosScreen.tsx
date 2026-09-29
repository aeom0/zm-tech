import React, { useState, useCallback } from 'react'
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'
import { ValidacionRow } from './validacion/components/ValidacionRow'
import { useValidacionData } from './validacion/hooks/useValidacionData'
import type {
  ValidacionItem,
  ValidacionFilter,
  VerificationAction,
  RowLoadingState,
} from './validacion/types'

const FILTERS: { id: ValidacionFilter; label: string }[] = [
  { id: 'pending', label: 'Por validar' },
  { id: 'approved', label: 'Validados' },
  { id: 'rejected', label: 'Rechazados' },
]

export default function ValidacionPagosScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { byFilter, counts, historyDays, refetchAll, verifyMutation } = useValidacionData()
  const [filter, setFilter] = useState<ValidacionFilter>('pending')

  // Estado per-row: { [appointmentId]: 'approved' | 'rejected' | null }
  const [rowLoading, setRowLoading] = useState<RowLoadingState>({})

  const active = byFilter[filter]

  const handleVerify = useCallback(
    async (appointmentId: string, action: VerificationAction) => {
      if (rowLoading[appointmentId]) return // ya procesando este item
      setRowLoading((prev) => ({ ...prev, [appointmentId]: action }))
      try {
        await verifyMutation.mutateAsync({ appointmentId, action })
      } finally {
        setRowLoading((prev) => {
          const next = { ...prev }
          delete next[appointmentId]
          return next
        })
      }
    },
    [rowLoading, verifyMutation]
  )

  const renderItem = useCallback(
    ({ item }: { item: ValidacionItem }) => (
      <ValidacionRow
        item={item}
        loadingAction={rowLoading[item.id] ?? null}
        onApprove={() => handleVerify(item.id, 'approved')}
        onReject={() => handleVerify(item.id, 'rejected')}
      />
    ),
    [rowLoading, handleVerify]
  )

  const emptyCopy: Record<ValidacionFilter, { icon: 'check-circle' | 'inbox'; title: string; sub: string }> = {
    pending: {
      icon: 'check-circle',
      title: 'Todo al día',
      sub: 'No hay pagos pendientes de validación.',
    },
    approved: {
      icon: 'inbox',
      title: 'Sin pagos validados',
      sub: `No hay pagos validados en los últimos ${historyDays} días.`,
    },
    rejected: {
      icon: 'inbox',
      title: 'Sin pagos rechazados',
      sub: `No hay pagos rechazados en los últimos ${historyDays} días.`,
    },
  }
  const empty = emptyCopy[filter]

  const listHeader = (
    <View style={styles.chips}>
      {FILTERS.map((f) => {
        const isActive = filter === f.id
        return (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[
              styles.chip,
              {
                borderColor: isActive ? theme.primary : theme.border,
                backgroundColor: isActive ? theme.primary : theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText
              style={[styles.chipText, { color: isActive ? theme.buttonText : theme.text }]}
            >
              {f.label}
              {counts[f.id] > 0 ? ` · ${counts[f.id]}` : ''}
            </ThemedText>
          </Pressable>
        )
      })}
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={active.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing['3xl'],
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          active.isLoading ? null : (
            <View style={styles.empty}>
              <Feather
                name={empty.icon}
                size={48}
                color={filter === 'pending' ? theme.success : theme.textMuted}
              />
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>{empty.title}</ThemedText>
              <ThemedText style={[styles.emptySub, { color: theme.textMuted }]}>{empty.sub}</ThemedText>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={active.isRefetching}
            onRefresh={refetchAll}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: Spacing['5xl'],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
  },
})
