import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { Poppins_800ExtraBold } from '@expo-google-fonts/poppins/800ExtraBold'
import { Poppins_300Light } from '@expo-google-fonts/poppins/300Light'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { TenantProvider } from '@/contexts/TenantContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useNotifications } from '@/hooks/useNotifications'
import { useExpoOTAOnLaunch } from '@/hooks/useExpoOTAOnLaunch'
import { useOtaUpdateUiSelector } from '@/stores/otaUpdateUiStore'
import { Onboarding } from '@/constants/theme'

import RootStackNavigator from '@/navigation/RootStackNavigator'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OtaUpdateOverlay } from '@/components/OtaUpdateOverlay'

/** Tiempo máximo de espera para cargar fuentes (evita "6000ms timeout" en web) */
const FONT_LOAD_TIMEOUT_MS = 12_000

/**
 * Tiempo extra que el splash permanece visible después de que los recursos
 * están listos. Da tiempo a que el usuario aprecie el splash antes de entrar.
 */
const SPLASH_EXTRA_DELAY_MS = 1_200

SplashScreen.preventAutoHideAsync()

function useFontsReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadFonts = async () => {
      try {
        const featherAsset = require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf')
        await Font.loadAsync({
          Feather: featherAsset,
          Poppins_800ExtraBold,
          Poppins_300Light,
        })
      } catch {
        // Timeout o error: seguimos igual para no bloquear la app
      }
    }

    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, FONT_LOAD_TIMEOUT_MS))

    Promise.race([loadFonts(), timeoutPromise]).then(() => {
      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return ready
}

function AppContent() {
  const { userId } = useAuth()
  useNotifications(userId)
  const fontsReady = useFontsReady()
  const otaListo = useOtaUpdateUiSelector((s) => s.listo)

  useEffect(() => {
    if (!fontsReady || !otaListo) return
    const timer = setTimeout(() => {
      SplashScreen.hideAsync()
    }, SPLASH_EXTRA_DELAY_MS)
    return () => clearTimeout(timer)
  }, [fontsReady, otaListo])

  if (!fontsReady || !otaListo) {
    return null
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <KeyboardProvider>
          <NavigationContainer>
            <RootStackNavigator />
          </NavigationContainer>
          <StatusBar style="light" />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

/**
 * OtaGate (paridad ZM Lash):
 * - Corre el hook OTA antes / encima del árbol de auth.
 * - Mientras el overlay está activo, no monta providers/nav (evita flash Login).
 */
function OtaGate() {
  useExpoOTAOnLaunch()
  const otaActiva = useOtaUpdateUiSelector((s) => s.visible)

  return (
    <View style={styles.gate}>
      <OtaUpdateOverlay />
      {!otaActiva && (
        <AuthProvider>
          <TenantProvider>
            <ThemeProvider>
              <QueryClientProvider client={queryClient}>
                <AppContent />
              </QueryClientProvider>
            </ThemeProvider>
          </TenantProvider>
        </AuthProvider>
      )}
    </View>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <OtaGate />
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: Onboarding.canvasBackground,
  },
  root: {
    flex: 1,
  },
})
