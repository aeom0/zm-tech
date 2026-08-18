import React, { useState, useCallback, useRef } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'

import { useTheme } from '@/hooks/useTheme'
import { Spacing } from '@/constants/theme'
import { AsignarRow } from './asignar/components/AsignarRow'
import { AsignarEmptyState } from './asignar/components/AsignarEmptyState'
import { AsignarLoadingPlaceholder } from './asignar/components/AsignarLoadingPlaceholder'
import { useAsignarData } from './asignar/hooks/useAsignarData'
import type { UnassignedAppointment, RowAssignState } from './asignar/types'

export default function AsignarProfesionalesScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme } = useTheme()
  const { employees, unassigned, isLoading, refetch, assignMutation, config } = useAsignarData()

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
    ({ item }: { item: UnassignedAppointment }) => (
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
        data={unassigned}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing['3xl'],
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          isLoading ? (
            <AsignarLoadingPlaceholder color={theme.primary} />
          ) : (
            <AsignarEmptyState terminology={config.terminology} />
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
