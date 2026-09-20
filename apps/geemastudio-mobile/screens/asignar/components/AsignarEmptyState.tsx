import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing } from '@/constants/theme'
import type { TenantConfig } from '@zmtech/tenant-config'
import type { AsignarPeriod } from '../types'

interface AsignarEmptyStateProps {
  terminology: TenantConfig['terminology']
  period: AsignarPeriod
}

/**
 * Lista vacía: no hay citas en la ventana del periodo seleccionado.
 */
export function AsignarEmptyState({ terminology, period }: AsignarEmptyStateProps) {
  const { theme } = useTheme()
  const rangeLabel = period === 'upcoming' ? 'los próximos 7 días' : 'los últimos 7 días'

  return (
    <View style={styles.empty}>
      <Feather name="users" size={48} color={theme.success} />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>Sin citas</ThemedText>
      <ThemedText style={[styles.emptySub, { color: theme.textMuted }]}>
        No hay {terminology.appointment}s con {terminology.staffSingular} en {rangeLabel}.
      </ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
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
