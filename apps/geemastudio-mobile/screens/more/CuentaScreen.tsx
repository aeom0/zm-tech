import React, { useCallback } from 'react'
import { ScrollView, StyleSheet, Alert, View, Switch } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'

import { MenuRow } from '@/components/MenuRow'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useThemePreference } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useHaptics } from '@/hooks/useHaptics'
import { useDemoReset } from '@/hooks/useDemoReset'
import { useBiometricAuth } from '@/hooks/useBiometricAuth'
import { Spacing, Colors } from '@/constants/theme'

export default function CuentaScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme, isDark } = useTheme()
  const { setPreference } = useThemePreference()
  const { logout } = useAuth()
  const { resetIfDemo } = useDemoReset()
  const haptics = useHaptics()
  const {
    isAvailable,
    isEnabled,
    isLoading: biometricLoading,
    disableBiometric,
    getBiometricTypeName,
  } = useBiometricAuth()

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

  const handleBiometricToggle = useCallback(
    (value: boolean) => {
      haptics.light()
      if (!value) {
        Alert.alert(
          'Desactivar acceso rápido',
          `¿Quieres desactivar el acceso con ${getBiometricTypeName()}?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Desactivar',
              style: 'destructive',
              onPress: () => {
                void disableBiometric()
              },
            },
          ]
        )
        return
      }

      Alert.alert(
        'Activar acceso rápido',
        `Para habilitar ${getBiometricTypeName()}, cierra sesión e inicia con correo y contraseña. Te preguntaremos al entrar.`,
        [{ text: 'Entendido' }]
      )
    },
    [disableBiometric, getBiometricTypeName, haptics]
  )

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
            thumbColor={Colors.light.buttonText}
          />
        }
      />

      {isAvailable && !biometricLoading ? (
        <View style={{ marginTop: Spacing.md }}>
          <MenuRow
            icon="smartphone"
            label={`Acceso con ${getBiometricTypeName()}`}
            onPress={() => handleBiometricToggle(!isEnabled)}
            rightElement={
              <Switch
                value={isEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ true: theme.primary, false: theme.border }}
                thumbColor={Colors.light.buttonText}
              />
            }
          />
          {!isEnabled ? (
            <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
              Se activa la próxima vez que inicies sesión con correo y contraseña.
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={{ marginTop: Spacing.md }}>
        <MenuRow icon="log-out" label="Cerrar sesión" onPress={handleLogout} isDestructive />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: {
    fontSize: 12,
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.xs,
    lineHeight: 16,
  },
})
