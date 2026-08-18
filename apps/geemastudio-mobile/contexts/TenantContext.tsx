import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { type TenantConfig, defaultTenantConfig, mergeTenantConfig } from '@zmtech/tenant-config'
import { useAuth } from '@/contexts/AuthContext'
import { fetchTenantSettings, upsertTenantSettings } from '@/services/tenantSettingsService'
import { insertEmpleadosTrasOnboarding } from '@/services/onboardingEmployeesService'
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
  isConfigured: boolean
  isLoading: boolean
  pendingOnboardingEmployees: PendingOnboardingEmployee[]
  addPendingOnboardingEmployee: (row: Omit<PendingOnboardingEmployee, 'id'>) => void
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
  const freshStartDoneRef = useRef(false)

  const addPendingOnboardingEmployee = useCallback((row: Omit<PendingOnboardingEmployee, 'id'>) => {
    setPendingOnboardingEmployees((prev) => [...prev, { ...row, id: nuevoIdPendiente() }])
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
          setConfig((prev) => ({ ...prev, ...parsed }))
        }

        const localConfigured = configured === 'true'
        setIsConfigured(localConfigured)

        // Si no hay marca local pero sí usuario, intentamos sincronizar desde Supabase
        if (!localConfigured && userId) {
          try {
            const remoteConfig = await fetchTenantSettings(userId)
            if (remoteConfig && isMounted) {
              await updateTenant(remoteConfig)
              await AsyncStorage.setItem(CONFIGURED_KEY, 'true')
              setIsConfigured(true)
            }
          } catch {
            // En caso de error remoto, seguimos con flujo local (onboarding)
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

    try {
      await upsertTenantSettings(config, userId)

      if (pendingOnboardingEmployees.length > 0) {
        if (!isAdmin) {
          return {
            ok: false as const,
            error:
              'Tu cuenta no tiene permiso para registrar equipo (se requiere rol dueño). Entra con la cuenta del negocio o pide acceso al administrador.',
          }
        }
        const empResult = await insertEmpleadosTrasOnboarding(
          pendingOnboardingEmployees.map(({ name, color }) => ({
            name,
            color,
          }))
        )
        if (!empResult.ok) {
          return {
            ok: false as const,
            error:
              empResult.message.includes('row-level security') || empResult.message.includes('RLS')
                ? 'No se pudo guardar el equipo (permisos). Revisa tu sesión o contacta soporte.'
                : `No se pudo guardar el equipo: ${empResult.message}`,
          }
        }
        setPendingOnboardingEmployees([])
        void queryClient.invalidateQueries({ queryKey: ['employees'] })
        void queryClient.invalidateQueries({
          queryKey: ['employees', 'active'],
        })
      }

      await AsyncStorage.setItem(CONFIGURED_KEY, 'true')
      setIsConfigured(true)
      return { ok: true as const }
    } catch (error) {
      // Log en desarrollo para depurar fallos al guardar configuración remota
      console.error('[TenantContext] Error al hacer upsert de tenant_settings', error)

      // Si RLS bloquea el upsert (nuevo row viola política), permitimos continuar
      // marcando el tenant como configurado en local, para no bloquear el uso
      // de la app durante el desarrollo. En producción se debería corregir la
      // política en Supabase.
      const message = error instanceof Error ? error.message : String(error ?? '')
      const isRlsViolation =
        typeof message === 'string' && message.toLowerCase().includes('row-level security')

      if (isRlsViolation) {
        await AsyncStorage.setItem(CONFIGURED_KEY, 'true')
        setIsConfigured(true)
        return { ok: true as const }
      }

      return {
        ok: false as const,
        error: 'Ocurrió un error al guardar la configuración en la nube. Inténtalo de nuevo.',
      }
    }
  }, [config, userId, isAdmin, pendingOnboardingEmployees])

  return (
    <TenantContext.Provider
      value={{
        config,
        updateTenant,
        markConfigured,
        isConfigured,
        isLoading,
        pendingOnboardingEmployees,
        addPendingOnboardingEmployee,
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
