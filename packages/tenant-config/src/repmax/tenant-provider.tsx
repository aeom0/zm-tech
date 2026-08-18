/**
 * TenantContext RepMAX — resuelve tienda activa vía membership (repmax_store_users).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { useRepmaxAuth } from './auth-provider'
import { mergeRepmaxTenantConfig, repmaxDefaultConfig } from './preset'
import type { RepmaxStoreRow, RepmaxTenantConfig } from './types'

type TenantContextValue = {
  config: RepmaxTenantConfig
  storeId: string | null
  store: RepmaxStoreRow | null
  isLoading: boolean
  refreshTenant: () => Promise<void>
  updateLocalConfig: (partial: Partial<RepmaxTenantConfig>) => void
}

const RepmaxTenantContext = createContext<TenantContextValue | null>(null)

function storeToConfig(store: RepmaxStoreRow): RepmaxTenantConfig {
  const rate = Number(store.usd_bs_rate)
  return mergeRepmaxTenantConfig(repmaxDefaultConfig, {
    storeId: store.id,
    slug: store.slug,
    storeName: store.name,
    city: store.city,
    plan: store.plan ?? 'basic',
    locale: {
      ...repmaxDefaultConfig.locale,
      currencyUsd: store.currency_usd ?? 'USD',
      currencyBs: store.currency_bs ?? 'BS',
      usdBsRate: Number.isFinite(rate) ? rate : 36.5,
    },
  })
}

export function RepmaxTenantProvider({ children }: { children: React.ReactNode }) {
  const { store, storeId, isLoading: authLoading, refreshMembership } = useRepmaxAuth()
  const [config, setConfig] = useState<RepmaxTenantConfig>({
    ...repmaxDefaultConfig,
  })
  const [isLoading, setIsLoading] = useState(true)

  const loadTenant = useCallback(async () => {
    if (!store) {
      setConfig({ ...repmaxDefaultConfig })
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setConfig(storeToConfig(store))
    setIsLoading(false)
  }, [store])

  useEffect(() => {
    if (authLoading) return
    void loadTenant()
  }, [authLoading, loadTenant])

  const updateLocalConfig = useCallback((partial: Partial<RepmaxTenantConfig>) => {
    setConfig((prev) => mergeRepmaxTenantConfig(prev, partial))
  }, [])

  const refreshTenant = useCallback(async () => {
    await refreshMembership()
  }, [refreshMembership])

  const value = useMemo<TenantContextValue>(
    () => ({
      config,
      storeId: config.storeId ?? storeId,
      store,
      isLoading: authLoading || isLoading,
      refreshTenant,
      updateLocalConfig,
    }),
    [config, storeId, store, authLoading, isLoading, refreshTenant, updateLocalConfig]
  )

  return <RepmaxTenantContext.Provider value={value}>{children}</RepmaxTenantContext.Provider>
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(RepmaxTenantContext)
  if (!ctx) {
    throw new Error('useTenant debe usarse dentro de <RepmaxTenantProvider>')
  }
  return ctx
}

export const useRepmaxTenant = useTenant
