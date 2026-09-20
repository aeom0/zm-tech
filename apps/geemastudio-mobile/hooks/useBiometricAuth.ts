/**
 * Autenticación biométrica (huella / Face ID).
 * Patrón portado de zetaeme mobile-sales; keys con scope GeemaStudio.
 * Los módulos nativos son opcionales (Expo Go / web → fallback).
 */
import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { ASYNC_STORAGE_BIOMETRIC_ENABLED } from '@/lib/asyncStorageKeys'

let LocalAuthentication: typeof import('expo-local-authentication') | null = null
let SecureStore: typeof import('expo-secure-store') | null = null

try {
  LocalAuthentication = require('expo-local-authentication')
} catch {
  if (__DEV__) {
    console.warn('[BIOMETRIC] expo-local-authentication no disponible')
  }
}

try {
  SecureStore = require('expo-secure-store')
} catch {
  if (__DEV__) {
    console.warn('[BIOMETRIC] expo-secure-store no disponible; fallback AsyncStorage')
  }
}

/** SecureStore solo permite alfanuméricos, ".", "-", "_" */
const BIOMETRIC_EMAIL_KEY = 'geemastudio.biometric.email'
const BIOMETRIC_PASSWORD_KEY = 'geemastudio.biometric.password'

export interface BiometricAuthResult {
  success: boolean
  error?: string
}

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false)
  const [biometricType, setBiometricType] = useState<number[]>([])
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkBiometricAvailability = useCallback(async () => {
    try {
      if (!LocalAuthentication) {
        setIsAvailable(false)
        return
      }
      const compatible = await LocalAuthentication.hasHardwareAsync()
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
      setIsAvailable(compatible && enrolled)
      setBiometricType(types)
    } catch (error) {
      console.error('[BIOMETRIC] availability:', error)
      setIsAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const checkBiometricEnabled = useCallback(async () => {
    try {
      const enabled = await AsyncStorage.getItem(ASYNC_STORAGE_BIOMETRIC_ENABLED)
      setIsEnabled(enabled === 'true')
    } catch (error) {
      console.error('[BIOMETRIC] enabled check:', error)
      setIsEnabled(false)
    }
  }, [])

  useEffect(() => {
    void checkBiometricAvailability()
    void checkBiometricEnabled()
  }, [checkBiometricAvailability, checkBiometricEnabled])

  const getBiometricTypeName = useCallback((): string => {
    if (!LocalAuthentication || biometricType.length === 0) {
      return 'autenticación biométrica'
    }
    if (biometricType.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'huella dactilar'
    }
    if (biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'reconocimiento facial'
    }
    if (biometricType.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'reconocimiento de iris'
    }
    return 'autenticación biométrica'
  }, [biometricType])

  const setCredential = async (email: string, password: string) => {
    if (SecureStore) {
      await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email)
      await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password)
    } else {
      await AsyncStorage.setItem(BIOMETRIC_EMAIL_KEY, email)
      await AsyncStorage.setItem(BIOMETRIC_PASSWORD_KEY, password)
    }
  }

  const getCredentials = async (): Promise<{ email: string | null; password: string | null }> => {
    if (SecureStore) {
      return {
        email: await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
        password: await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY),
      }
    }
    return {
      email: await AsyncStorage.getItem(BIOMETRIC_EMAIL_KEY),
      password: await AsyncStorage.getItem(BIOMETRIC_PASSWORD_KEY),
    }
  }

  const clearCredentials = async () => {
    if (SecureStore) {
      await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY)
      await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY)
    } else {
      await AsyncStorage.removeItem(BIOMETRIC_EMAIL_KEY)
      await AsyncStorage.removeItem(BIOMETRIC_PASSWORD_KEY)
    }
  }

  const disableBiometric = useCallback(async (): Promise<void> => {
    try {
      await clearCredentials()
      await AsyncStorage.removeItem(ASYNC_STORAGE_BIOMETRIC_ENABLED)
      setIsEnabled(false)
    } catch (error) {
      console.error('[BIOMETRIC] disable:', error)
    }
  }, [])

  const enableBiometric = useCallback(
    async (email: string, password: string): Promise<BiometricAuthResult> => {
      try {
        if (!LocalAuthentication) {
          return {
            success: false,
            error: 'La autenticación biométrica no está disponible en este dispositivo',
          }
        }

        const compatible = await LocalAuthentication.hasHardwareAsync()
        const enrolled = await LocalAuthentication.isEnrolledAsync()
        if (!compatible || !enrolled) {
          return {
            success: false,
            error: 'La autenticación biométrica no está disponible en este dispositivo',
          }
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirma tu identidad para habilitar el acceso rápido',
          cancelLabel: 'Cancelar',
          disableDeviceFallback: false,
        })

        if (!result.success) {
          const cancelled = 'error' in result && result.error === 'user_cancel'
          return {
            success: false,
            error: cancelled ? 'Autenticación cancelada' : 'Error en autenticación biométrica',
          }
        }

        const normalizedEmail = email.trim().toLowerCase()
        await setCredential(normalizedEmail, password)
        await AsyncStorage.setItem(ASYNC_STORAGE_BIOMETRIC_ENABLED, 'true')
        setIsEnabled(true)
        return { success: true }
      } catch (error: unknown) {
        console.error('[BIOMETRIC] enable:', error)
        const message = error instanceof Error ? error.message : 'Error al habilitar autenticación biométrica'
        return { success: false, error: message }
      }
    },
    []
  )

  const authenticateWithBiometric = useCallback(async (): Promise<{
    success: boolean
    email?: string
    password?: string
    error?: string
  }> => {
    try {
      if (!LocalAuthentication) {
        return { success: false, error: 'Autenticación biométrica no disponible' }
      }

      const enabled = await AsyncStorage.getItem(ASYNC_STORAGE_BIOMETRIC_ENABLED)
      if (enabled !== 'true') {
        return { success: false, error: 'Autenticación biométrica no habilitada' }
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
      let authMessage = 'Autentícate para acceder a la app'
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        authMessage = 'Usa tu huella dactilar para acceder'
      } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        authMessage = 'Usa reconocimiento facial para acceder'
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: authMessage,
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar contraseña',
        disableDeviceFallback: false,
      })

      if (!result.success) {
        const cancelled = 'error' in result && result.error === 'user_cancel'
        return {
          success: false,
          error: cancelled ? 'Autenticación cancelada' : 'Error en autenticación biométrica',
        }
      }

      const { email, password } = await getCredentials()
      if (!email || !password) {
        await disableBiometric()
        return {
          success: false,
          error: 'Credenciales no encontradas. Inicia sesión con correo y contraseña.',
        }
      }

      return { success: true, email, password }
    } catch (error: unknown) {
      console.error('[BIOMETRIC] authenticate:', error)
      const message = error instanceof Error ? error.message : 'Error en autenticación biométrica'
      return { success: false, error: message }
    }
  }, [disableBiometric])

  return {
    isAvailable,
    isEnabled,
    isLoading,
    biometricType,
    enableBiometric,
    authenticateWithBiometric,
    disableBiometric,
    getBiometricTypeName,
  }
}
