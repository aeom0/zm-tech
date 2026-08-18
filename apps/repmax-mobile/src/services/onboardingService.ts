// ============================================================
// RepMAX Business Suite — Servicio de persistencia del onboarding
// Usa AsyncStorage con clave @repmax/onboarding
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { OnboardingState } from '../types/onboarding'

const STORAGE_KEY = '@repmax/onboarding'

// Estado inicial vacío (sin selecciones)
const INITIAL_STATE: OnboardingState = {
  country: null,
  vehicleType: null,
  businessType: null,
  theme: null,
  completed: false,
}

/** Persiste el estado completo del onboarding en AsyncStorage */
export async function saveOnboarding(state: OnboardingState): Promise<void> {
  try {
    const json = JSON.stringify(state)
    await AsyncStorage.setItem(STORAGE_KEY, json)
  } catch (error) {
    console.error('[onboardingService] Error al guardar el onboarding:', error)
  }
}

/** Lee el estado del onboarding desde AsyncStorage. Retorna null si no existe. */
export async function getOnboarding(): Promise<OnboardingState | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY)
    if (!json) return null
    return JSON.parse(json) as OnboardingState
  } catch (error) {
    console.error('[onboardingService] Error al leer el onboarding:', error)
    return null
  }
}

/** Marca el onboarding como completado sin alterar el resto del estado */
export async function markOnboardingComplete(): Promise<void> {
  try {
    const current = await getOnboarding()
    const updated: OnboardingState = { ...(current ?? INITIAL_STATE), completed: true }
    await saveOnboarding(updated)
  } catch (error) {
    console.error('[onboardingService] Error al marcar onboarding como completado:', error)
  }
}

/** Retorna true si el usuario ya completó el onboarding */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const state = await getOnboarding()
    return state?.completed === true
  } catch (error) {
    console.error('[onboardingService] Error al verificar estado del onboarding:', error)
    return false
  }
}

/** Elimina todos los datos del onboarding — solo para testing/reset */
export async function clearOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('[onboardingService] Error al limpiar el onboarding:', error)
  }
}
