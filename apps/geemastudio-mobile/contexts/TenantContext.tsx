import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { type TenantConfig, defaultTenantConfig, mergeTenantConfig } from '@zmtech/tenant-config'
import { useAuth } from '@/contexts/AuthContext'
import {
  completeOnboarding,
  insertOnboardingEmployees,
  insertOnboardingServiceCategories,
} from '@geemastudio/data'
import { supabase } from '@/lib/supabase'
import {
  fetchTenantSettings,
  resolveTenantSlug,
  upsertTenantSettings,
} from '@/services/tenantSettingsService'
import { queryClient } from '@/lib/query-client'
import {
  ALL_TENANT_ASYNC_KEYS,
  ASYNC_STORAGE_TENANT_CONFIGURED,
  ASYNC_STORAGE_TENANT_CONFIG,
  migrateLegacyAsyncStorageKeys,
} from '@/lib/asyncStorageKeys'

const STORAGE_KEY = ASYNC_STORAGE_TENANT_CONFIG
const CONFIGURED_KEY = ASYNC_STORAGE_TENANT_CONFIGURED

/** Beta / preview: ignora AsyncStorage de dev y fuerza onboarding (quitar en production estable). */
const FORCE_FRESH_START = process.env.EXPO_PUBLIC_FORCE_FRESH_START === 'true'

/** Empleados capturados en paso 3 sin sesión; se insertan en BD al `markConfigured`. */
export interface PendingOnboardingEmployee {
  id: string
  name: string
  color: string
}

interface TenantContextValue {
  config: TenantConfig
  updateTenant: (
    partial: Partial<TenantConfig>,
    options?: { syncRemote?: boolean }
  ) => Promise<void>
  markConfigured: () => Promise<{ ok: boolean; error?: string }>
  /** Olvida el negocio guardado en el dispositivo para volver al onboarding desde cero. */
  resetTenant: () => Promise<void>
  isConfigured: boolean
  isLoading: boolean
  pendingOnboardingEmployees: PendingOnboardingEmployee[]
  addPendingOnboardingEmployee: (row: Omit<PendingOnboardingEmployee, 'id'>) => void
  /** Categorías elegidas en el paso 5 (sin sesión); se insertan al `markConfigured`. */
  setPendingOnboardingCategories: (names: string[]) => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

function nuevoIdPendiente(): string {
  return `pend-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { userId, isAdmin } = useAuth()
  const [config, setConfig] = useState<TenantConfig>(defaultTenantConfig)
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingOnboardingEmployees, setPendingOnboardingEmployees] = useState<
    PendingOnboardingEmployee[]
  >([])
  const [pendingOnboardingCategories, setPendingOnboardingCategories] = useState<string[]>([])
  const freshStartDoneRef = useRef(false)

  const addPendingOnboardingEmployee = useCallback((row: Omit<PendingOnboardingEmployee, 'id'>) => {
    setPendingOnboardingEmployees((prev) => [...prev, { ...row, id: nuevoIdPendiente() }])
  }, [])

  const resetTenant = useCallback(async () => {
    await AsyncStorage.multiRemove([...ALL_TENANT_ASYNC_KEYS])
    setConfig(defaultTenantConfig)
    setPendingOnboardingEmployees([])
    setPendingOnboardingCategories([])
    setIsConfigured(false)
    queryClient.clear()
  }, [])

  const updateTenant = useCallback(
    async (partial: Partial<TenantConfig>, options?: { syncRemote?: boolean }) => {
      let next: TenantConfig | null = null
      setConfig((prev) => {
        next = mergeTenantConfig(prev, partial)
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
      if (options?.syncRemote && userId && next) {
        await upsertTenantSettings(next, userId)
      }
    },
    [userId]
  )

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        await migrateLegacyAsyncStorageKeys()

        if (FORCE_FRESH_START && !freshStartDoneRef.current) {
          freshStartDoneRef.current = true
          await AsyncStorage.multiRemove([...ALL_TENANT_ASYNC_KEYS])
          setPendingOnboardingEmployees([])
        }

        const [raw, configured] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(CONFIGURED_KEY),
        ])

        if (!isMounted) return

        if (raw) {
          const parsed = JSON.parse(raw) as Partial<TenantConfig>
          setConfig((prev) => mergeTenantConfig(prev, parsed))
        }

        const localConfigured = configured === 'true'
        setIsConfigured(localConfigured)

        // Siempre hidratar desde BD si hay sesión: timezone/horarios del tenant
        // (p. ej. America/Lima) no deben quedar pisados por un AsyncStorage viejo.
        if (userId) {
          try {
            const remoteConfig = await fetchTenantSettings(userId)
            if (remoteConfig && isMounted) {
              await updateTenant(remoteConfig)
              if (!localConfigured) {
                await AsyncStorage.setItem(CONFIGURED_KEY, 'true')
                setIsConfigured(true)
              }
            }
          } catch {
            // Sin remoto: se mantiene lo local (onboarding o cache)
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [userId, updateTenant])

  const markConfigured = useCallback(async () => {
    if (!userId) {
      return {
        ok: false,
        error: 'No hay usuario autenticado para guardar la configuración.',
      }
    }
    if (!isAdmin) {
      return {
        ok: false as const,
        error:
          'Tu cuenta no tiene permiso para configurar el negocio (se requiere rol dueño). Entra con la cuenta del negocio.',
      }
    }

    try {
      const tenantSlug = await resolveTenantSlug(userId)
      if (!tenantSlug) {
        return { ok: false as const, error: 'No encontramos tu negocio. Cierra sesión y vuelve a entrar.' }
      }

      await completeOnboarding(supabase, tenantSlug, config)
      await insertOnboardingEmployees(supabase, tenantSlug, pendingOnboardingEmployees)
      await insertOnboardingServiceCategories(supabase, tenantSlug, pendingOnboardingCategories)

      setPendingOnboardingEmployees([])
      setPendingOnboardingCategories([])
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      void queryClient.invalidateQueries({ queryKey: ['service_categories'] })

      await AsyncStorage.setItem(CONFIGURED_KEY, 'true')
      setIsConfigured(true)
      return { ok: true as const }
    } catch (error) {
      console.error('[TenantContext] Error al guardar el onboarding', error)
      return {
        ok: false as const,
        error: 'No pudimos guardar la configuración de tu negocio. Inténtalo de nuevo.',
      }
    }
  }, [config, userId, isAdmin, pendingOnboardingEmployees, pendingOnboardingCategories])

  return (
    <TenantContext.Provider
      value={{
        config,
        updateTenant,
        markConfigured,
        resetTenant,
        isConfigured,
        isLoading,
        pendingOnboardingEmployees,
        addPendingOnboardingEmployee,
        setPendingOnboardingCategories,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) {
    throw new Error('useTenant debe usarse dentro de <TenantProvider>')
  }
  return ctx
}
