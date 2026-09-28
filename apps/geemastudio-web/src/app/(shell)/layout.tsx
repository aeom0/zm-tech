import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchTenantBrandForUser, type TenantBrand } from '@/lib/tenant-brand'
import { ShellProviders } from './ShellProviders'

/**
 * Layout compartido por /panel, /finanzas y /dashboard: monta el sidebar
 * (`PanelShell`), el `QueryClientProvider` y el `AuthProvider` una sola vez,
 * para que Next.js reconcilie el árbol al navegar entre esas secciones en
 * vez de desmontar y remontar todo (parpadeo de página completa).
 *
 * La autenticación por-sección (redirect a /login si no hay sesión en
 * /panel, login propio en /finanzas) sigue viviendo en el layout de cada
 * subruta; este layout solo resuelve datos de sesión/marca para pintar el
 * shell, sin bloquear el render.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getSession()

  const brand: TenantBrand = data.session
    ? await fetchTenantBrandForUser(supabase, data.session.user.id)
    : { primary: null, accent: null, businessName: null, logoUrl: null }

  return (
    <ShellProviders
      session={data.session ? { userEmail: data.session.user.email ?? 'usuario' } : null}
      primaryColor={brand.primary}
      accentColor={brand.accent}
      tenantName={brand.businessName}
      tenantLogoUrl={brand.logoUrl}
    >
      {children}
    </ShellProviders>
  )
}
