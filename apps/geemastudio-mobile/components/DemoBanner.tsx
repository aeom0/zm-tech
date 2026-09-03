import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { useTenant } from '@/contexts/TenantContext'
import { useTheme } from '@/hooks/useTheme'

/**
 * Barra informativa visible solo en modo demo.
 * Debajo del área de tabs (MainTabNavigator).
 */
export function DemoBanner() {
  const { config } = useTenant()
  const { theme } = useTheme()
  if (!config.isDemo) return null

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: `${theme.warning}22`, borderBottomColor: `${theme.warning}55` },
      ]}
    >
      <Text style={[styles.text, { color: theme.warning }]}>
        Modo demo · Los cambios se restablecen al cerrar sesión
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})
