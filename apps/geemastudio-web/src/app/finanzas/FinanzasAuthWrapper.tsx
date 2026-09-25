'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { DEFAULT_TENANT_ACCENT, DEFAULT_TENANT_PRIMARY, tenantCssVars } from '@/lib/tenant-theme'

type FinanzasBrand = { primary: string; accent: string }

const FinanzasBrandContext = createContext<FinanzasBrand>({
  primary: DEFAULT_TENANT_PRIMARY,
  accent: DEFAULT_TENANT_ACCENT,
})

/** Colores de marca resueltos del tenant, para charts que no leen CSS vars. */
export function useFinanzasBrand() {
  return useContext(FinanzasBrandContext)
}

export function FinanzasAuthWrapper({
  children,
  primaryColor,
  accentColor,
}: {
  children: React.ReactNode
  primaryColor?: string | null
  accentColor?: string | null
}) {
  const [queryClient] = useState(() => new QueryClient())
  const vars = useMemo(() => tenantCssVars(primaryColor, accentColor), [primaryColor, accentColor])
  const brand = useMemo<FinanzasBrand>(
    () => ({ primary: vars['--tenant-primary'], accent: vars['--tenant-accent'] }),
    [vars]
  )

  // `dark` fuerza el modo oscuro igual que /panel (sin depender del SO); --primary/--accent
  // reutilizan los estilos existentes con la marca del tenant en vez de los defaults globales.
  return (
    <div
      className="dark"
      style={{ ...vars, '--primary': brand.primary, '--accent': brand.accent } as React.CSSProperties}
    >
      <QueryClientProvider client={queryClient}>
        <FinanzasBrandContext.Provider value={brand}>
          <AuthProvider>{children}</AuthProvider>
        </FinanzasBrandContext.Provider>
      </QueryClientProvider>
    </div>
  )
}
