import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, View, StyleSheet } from 'react-native'
import * as SplashScreenExpo from 'expo-splash-screen'
import MainTabNavigator from '@/navigation/MainTabNavigator'
import { LoginScreen } from '@/screens/LoginScreen'
import { ThemedText } from '@/components/ThemedText'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { Onboarding } from '@/constants/theme'
import { useOtaUpdateUiSelector } from '@/stores/otaUpdateUiStore'

SplashScreenExpo.preventAutoHideAsync?.()

import OnboardingCountryScreen from '@/screens/onboarding/OnboardingCountryScreen'
import OnboardingBusinessTypeScreen from '@/screens/onboarding/OnboardingBusinessTypeScreen'
import OnboardingBasicInfoScreen from '@/screens/onboarding/OnboardingBasicInfoScreen'
import OnboardingTeamScreen from '@/screens/onboarding/OnboardingTeamScreen'
import OnboardingServicesScreen from '@/screens/onboarding/OnboardingServicesScreen'
import OnboardingCompleteScreen from '@/screens/onboarding/OnboardingCompleteScreen'
import OnboardingAuthScreen from '@/screens/onboarding/OnboardingAuthScreen'
import OnboardingEntryScreen from '@/screens/onboarding/OnboardingEntryScreen'

/** 1 País · 2 Tipo · 3 Datos · 4 Equipo · 5 Servicios · 6 Auth · 7 Listo */
type PasoOnboarding = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * Flujo completo de la app:
 *   (no configurado) Entrada → nuevo negocio (país + pasos) → auth → listo;
 *           o "ya tengo cuenta" → OnboardingAuthScreen (mismo look del wizard).
 *           → (configurado, no auth) LoginScreen clásico
 *           → (configurado, auth) MainTabNavigator
 * La splash nativa (expo-splash-screen) cubre el tiempo de carga inicial.
 */
export default function AuthGate() {
  const { isAuthenticated, logout } = useAuth()
  const { isConfigured, isLoading: tenantLoading } = useTenant()
  const [paso, setPaso] = useState<PasoOnboarding>(1)
  const [onboardingSessionDone, setOnboardingSessionDone] = useState(false)
  const [tenantHydrationStuck, setTenantHydrationStuck] = useState(false)

  type EntryChoice = 'none' | 'new' | 'existing'
  const [entryChoice, setEntryChoice] = useState<EntryChoice>('none')

  // Flag de desarrollo para obligar a pasar por el onboarding completo
  const forceOnboardingDev = __DEV__ && process.env.EXPO_PUBLIC_FORCE_ONBOARDING === 'true'

  const otaListo = useOtaUpdateUiSelector((s) => s.listo)
  const otaVisible = useOtaUpdateUiSelector((s) => s.visible)

  // Ocultar splash nativa cuando el tenant termina de cargar y el chequeo OTA terminó
  useEffect(() => {
    if (!tenantLoading && otaListo) {
      SplashScreenExpo.hideAsync?.()
    }
  }, [tenantLoading, otaListo])

  // Tras un login "ya tengo cuenta" exitoso, si tras 10s el tenant remoto
  // sigue sin hidratar (sin red, o cuenta sin tenant_settings), salimos del
  // spinner infinito y ofrecemos reintentar/cerrar sesión.
  useEffect(() => {
    if (entryChoice !== 'existing' || !isAuthenticated || isConfigured) {
      setTenantHydrationStuck(false)
      return
    }
    const timer = setTimeout(() => setTenantHydrationStuck(true), 10000)
    return () => clearTimeout(timer)
  }, [entryChoice, isAuthenticated, isConfigured])

  // Mientras AsyncStorage carga, la splash nativa cubre la pantalla
  if (tenantLoading || !otaListo) return null

  if (otaVisible) {
    return <View style={styles.otaPlaceholder} />
  }

  // Primero: si no está configurado, o si en desarrollo forzamos onboarding
  // (forceOnboardingDev solo fuerza mientras no se haya completado esta sesión)
  if (!isConfigured || (forceOnboardingDev && !onboardingSessionDone)) {
    // Pantalla de entrada: elegir entre nuevo negocio o ya tengo cuenta
    if (entryChoice === 'none') {
      return (
        <OnboardingEntryScreen
          onCreateNew={() => setEntryChoice('new')}
          onLoginExisting={() => setEntryChoice('existing')}
        />
      )
    }

    // Usuario indica que ya tiene cuenta → mismo look onboarding (no LoginScreen aislado)
    if (entryChoice === 'existing') {
      // Login ya fue exitoso; solo falta que TenantContext hidrate el tenant remoto
      // (isConfigured pasa a true y este bloque completo se abandona solo).
      // No enrutar al wizard de "nuevo negocio": eso causaba un parpadeo del
      // paso 1/2 del wizard mientras se esperaba la carga remota.
      if (isAuthenticated) {
        if (tenantHydrationStuck) {
          return (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.stuckText}>
                No pudimos cargar tu negocio. Verifica tu conexión e intenta de nuevo.
              </ThemedText>
              <Pressable
                style={styles.stuckButton}
                onPress={() => {
                  setTenantHydrationStuck(false)
                  setEntryChoice('none')
                  void logout()
                }}
              >
                <ThemedText style={styles.stuckButtonText}>Cerrar sesión</ThemedText>
              </Pressable>
            </View>
          )
        }
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Onboarding.lunarisAccent} size="large" />
          </View>
        )
      }
      return (
        <OnboardingAuthScreen
          flow="returning"
          onBack={() => setEntryChoice('none')}
          onSuccess={() => {}}
        />
      )
    }

    // entryChoice === "new" → flujo de wizard completo
    if (paso === 1) {
      return (
        <OnboardingCountryScreen
          onNext={() => setPaso(2)}
          onBack={() => setEntryChoice('none')}
        />
      )
    }
    if (paso === 2) {
      return (
        <OnboardingBusinessTypeScreen onNext={() => setPaso(3)} onBack={() => setPaso(1)} />
      )
    }
    if (paso === 3) {
      return <OnboardingBasicInfoScreen onNext={() => setPaso(4)} onBack={() => setPaso(2)} />
    }
    if (paso === 4) {
      return <OnboardingTeamScreen onNext={() => setPaso(5)} onBack={() => setPaso(3)} />
    }
    if (paso === 5) {
      return <OnboardingServicesScreen onNext={() => setPaso(6)} onBack={() => setPaso(4)} />
    }
    if (paso === 6) {
      if (!isAuthenticated) {
        return <OnboardingAuthScreen onSuccess={() => setPaso(7)} onBack={() => setPaso(5)} />
      }
      return (
        <OnboardingCompleteScreen
          onFinish={() => {
            setPaso(1)
            setOnboardingSessionDone(true)
          }}
        />
      )
    }
    return (
      <OnboardingCompleteScreen
        onFinish={() => {
          setPaso(1)
          setOnboardingSessionDone(true)
        }}
      />
    )
  }

  // Ya configurado pero sin sesión → login clásico (fuera del wizard)
  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return <MainTabNavigator />
}

const styles = StyleSheet.create({
  otaPlaceholder: {
    flex: 1,
    backgroundColor: Onboarding.canvasBackground,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Onboarding.canvasBackground,
    paddingHorizontal: 32,
    gap: 20,
  },
  stuckText: {
    textAlign: 'center',
    color: '#ffffffB0',
    fontSize: 15,
    lineHeight: 22,
  },
  stuckButton: {
    borderWidth: 1,
    borderColor: '#ffffff26',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  stuckButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
})
