import React from 'react'
import { ScrollView, StyleSheet, Alert, View, Switch } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'

import { MenuRow } from '@/components/MenuRow'
import { useTheme } from '@/hooks/useTheme'
import { useThemePreference } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useHaptics } from '@/hooks/useHaptics'
import { useDemoReset } from '@/hooks/useDemoReset'
import { Spacing } from '@/constants/theme'

export default function CuentaScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme, isDark } = useTheme()
  const { setPreference } = useThemePreference()
  const { logout } = useAuth()
  const { resetIfDemo } = useDemoReset()
  const haptics = useHaptics()

  const handleLogout = () => {
    haptics.warning()
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await resetIfDemo()
          await logout()
        },
      },
    ])
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing['3xl'],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <MenuRow
        icon={isDark ? 'moon' : 'sun'}
        label="Apariencia"
        onPress={() => setPreference(isDark ? 'light' : 'dark')}
        rightElement={
          <Switch
            value={isDark}
            onValueChange={(val) => setPreference(val ? 'dark' : 'light')}
            trackColor={{ true: theme.primary, false: theme.border }}
            thumbColor="#FFFFFF"
          />
        }
      />

      <View style={{ marginTop: Spacing.md }}>
        <MenuRow icon="log-out" label="Cerrar sesión" onPress={handleLogout} isDestructive />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
