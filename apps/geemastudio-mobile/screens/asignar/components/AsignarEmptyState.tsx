import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing } from '@/constants/theme'
import type { TenantConfig } from '@zmtech/tenant-config'

interface AsignarEmptyStateProps {
  terminology: TenantConfig['terminology']
}

/**
 * Lista vacía: no hay citas sin profesional en la ventana de 7 días.
 */
export function AsignarEmptyState({ terminology }: AsignarEmptyStateProps) {
  const { theme } = useTheme()

  return (
    <View style={styles.empty}>
      <Feather name="users" size={48} color={theme.success} />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>Todo asignado</ThemedText>
      <ThemedText style={[styles.emptySub, { color: theme.textMuted }]}>
        No hay {terminology.appointment}s sin {terminology.staffSingular} en los próximos 7 días.
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
