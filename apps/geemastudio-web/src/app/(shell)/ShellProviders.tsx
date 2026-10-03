'use client'

import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider } from '@/contexts/AuthContext'
import { tenantCssVars } from '@/lib/tenant-theme'
import { ThemeProvider } from '@/lib/theme-mode'
import { PanelShell } from './panel/PanelShell'
import { FinanzasBrandContext, type FinanzasBrand } from './finanzas-brand-context'

/** Rutas que no deben mostrar la navegación del panel (sidebar y tab bar). */
const UNFRAMED_PATHS = ['/finanzas/login']

export function ShellProviders({
  children,
  session,
  primaryColor,
  accentColor,
  tenantName,
  tenantLogoUrl,
}: {
  children: React.ReactNode
  session: { userEmail: string } | null
  primaryColor?: string | null
  accentColor?: string | null
  tenantName?: string | null
  tenantLogoUrl?: string | null
}) {
  const pathname = usePathname()
  const [queryClient] = useState(() => new QueryClient())
  const vars = useMemo(() => tenantCssVars(primaryColor, accentColor), [primaryColor, accentColor])
  const brand = useMemo<FinanzasBrand>(
    () => ({ primary: vars['--tenant-primary'], accent: vars['--tenant-accent'] }),
    [vars]
  )

  const framed = Boolean(session) && !UNFRAMED_PATHS.includes(pathname ?? '')

  return (
    <div
      className="shell-root"
      style={
        { ...vars, '--primary': brand.primary, '--accent': brand.accent } as React.CSSProperties
      }
    >
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <FinanzasBrandContext.Provider value={brand}>
            <AuthProvider>
              {framed && session ? (
                <PanelShell
                  userEmail={session.userEmail}
                  tenantName={tenantName}
                  tenantLogoUrl={tenantLogoUrl}
                >
                  {children}
                </PanelShell>
              ) : (
                children
              )}
            </AuthProvider>
          </FinanzasBrandContext.Provider>
        </QueryClientProvider>
      </ThemeProvider>
    </div>
  )
}
