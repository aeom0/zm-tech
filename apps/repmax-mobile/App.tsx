import 'react-native-gesture-handler'
import React, { useEffect, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import * as Updates from 'expo-updates'

import { AuthProvider } from './src/context/AuthContext'
import { OnboardingProvider } from './src/context/OnboardingContext'
import { CartProvider } from './src/context/CartContext'
import AppNavigator from './src/navigation/AppNavigator'

// Mantener splash nativa mientras cargan fuentes / OTA
SplashScreen.preventAutoHideAsync()

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  const otaChecked = useRef(false)
  const [otaReady, setOtaReady] = React.useState(__DEV__)

  // Chequeo OTA al arranque (mismo patrón que GeemaStudio). Timeout 8s.
  useEffect(() => {
    if (__DEV__ || otaChecked.current) {
      setOtaReady(true)
      return
    }
    otaChecked.current = true

    const checkOTA = async () => {
      try {
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
        const update = await Promise.race([Updates.checkForUpdateAsync(), timeout])

        if (update && 'isAvailable' in update && update.isAvailable) {
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync()
          return
        }
      } catch {
        // Sin red o error — seguir con el bundle embebido
      } finally {
        setOtaReady(true)
      }
    }

    void checkOTA()
  }, [])

  useEffect(() => {
    if (fontsLoaded && otaReady) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, otaReady])

  if (!fontsLoaded || !otaReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <OnboardingProvider>
            <CartProvider>
              <AppNavigator />
            </CartProvider>
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
