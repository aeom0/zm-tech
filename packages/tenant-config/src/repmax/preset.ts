import type { RepmaxTenantConfig } from './types'

export const repmaxDefaultConfig: RepmaxTenantConfig = {
  storeId: null,
  slug: '',
  storeName: 'RepMAX',
  city: null,
  plan: 'basic',
  theme: {
    primaryColor: '#FF8C00',
    accentColor: '#1A2B3C',
    darkMode: false,
  },
  locale: {
    currencyUsd: 'USD',
    currencyBs: 'BS',
    usdBsRate: 36.5,
    language: 'es-VE',
  },
}

export function mergeRepmaxTenantConfig(
  base: RepmaxTenantConfig,
  partial: Partial<RepmaxTenantConfig>
): RepmaxTenantConfig {
  return {
    ...base,
    ...partial,
    theme: { ...base.theme, ...(partial.theme ?? {}) },
    locale: { ...base.locale, ...(partial.locale ?? {}) },
  }
}
