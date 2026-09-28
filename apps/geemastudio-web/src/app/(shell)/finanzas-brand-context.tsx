'use client'

import { createContext, useContext } from 'react'

import { DEFAULT_TENANT_ACCENT, DEFAULT_TENANT_PRIMARY } from '@/lib/tenant-theme'

export type FinanzasBrand = { primary: string; accent: string }

export const FinanzasBrandContext = createContext<FinanzasBrand>({
  primary: DEFAULT_TENANT_PRIMARY,
  accent: DEFAULT_TENANT_ACCENT,
})

/** Colores de marca resueltos del tenant, para charts que no leen CSS vars. */
export function useFinanzasBrand() {
  return useContext(FinanzasBrandContext)
}
