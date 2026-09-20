import React, { useState, useCallback, useRef } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/hooks/useTheme'
import { Spacing } from '@/constants/theme'
import { AsignarRow } from './asignar/components/AsignarRow'
import { AsignarEmptyState } from './asignar/components/AsignarEmptyState'
import { AsignarLoadingPlaceholder } from './asignar/components/AsignarLoadingPlaceholder'
import { AsignarPeriodTabs } from './asignar/components/AsignarPeriodTabs'
import { useAsignarData } from './asignar/hooks/useAsignarData'
import type { AsignarAppointment, AsignarPeriod, RowAssignState } from './asignar/types'

/**
 * Altura aproximada del tab bar (evita useBottomTabBarHeight, que crashea en build
 * nativo cuando la pantalla está dentro de un Stack anidado en un Tab — mismo fix
 * ya validado en AsignarChicasScreen de ZM).
 */
const TAB_BAR_HEIGHT = 60

export default function AsignarProfesionalesScreen() {
  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom
  const { theme } = useTheme()
  const { employees, upcoming, past, isLoading, refetch, assignMutation, config } =
    useAsignarData()

  const [period, setPeriod] = useState<AsignarPeriod>('upcoming')
  const data = period === 'upcoming' ? upcoming : past

  const [rowSaving, setRowSaving] = useState<RowAssignState>({})
  /** Evita doble submit y mantiene estable `handleAssign` (sin depender de rowSaving) */
  const pendingIdsRef = useRef<Set<string>>(new Set())

  const handleAssign = useCallback(
    async (appointmentId: string, employeeId: string) => {
      if (pendingIdsRef.current.has(appointmentId)) return
      pendingIdsRef.current.add(appointmentId)
      setRowSaving((prev) => ({ ...prev, [appointmentId]: true }))
      try {
        await assignMutation.mutateAsync({ appointmentId, employeeId })
      } finally {
        pendingIdsRef.current.delete(appointmentId)
        setRowSaving((prev) => {
          const next = { ...prev }
          delete next[appointmentId]
          return next
        })
      }
    },
    [assignMutation]
  )

  const renderItem = useCallback(
    ({ item }: { item: AsignarAppointment }) => (
      <AsignarRow
        item={item}
        employees={employees}
        isSaving={rowSaving[item.id] ?? false}
        onAssign={(employeeId) => handleAssign(item.id, employeeId)}
        locale={config.locale.language}
      />
    ),
    [employees, rowSaving, handleAssign, config.locale.language]
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: (headerHeight || insets.top + 56) + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing['3xl'],
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <AsignarPeriodTabs period={period} onChange={setPeriod} />
        }
        ListHeaderComponentStyle={{ marginBottom: Spacing.md }}
        ListEmptyComponent={
          isLoading ? (
            <AsignarLoadingPlaceholder color={theme.primary} />
          ) : (
            <AsignarEmptyState terminology={config.terminology} period={period} />
          )
        }
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
