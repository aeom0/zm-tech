import type { MetadataRoute } from 'next'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchTenantBrandForUser } from '@/lib/tenant-brand'
import { DEFAULT_TENANT_PRIMARY } from '@/lib/tenant-theme'

const BACKGROUND_COLOR = '#0F0F0F'

// Ícono/nombre de la app instalada (launcher) usan el logo y nombre del tenant
// cuando hay sesión activa; si no, cae al branding fijo de GeemaStudio. El
// ícono queda cacheado por dispositivo al instalar — aceptable (1 negocio =
// 1 dispositivo). No hay soporte nativo en Next.js para un manifest distinto
// por ruta, así que este mismo manifest sirve landing, login y panel.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = 'GeemaStudio'
  let icons: MetadataRoute.Manifest['icons'] = [{ src: '/favicon.png', sizes: 'any' }]
  let themeColor = DEFAULT_TENANT_PRIMARY

  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id

    if (userId) {
      const brand = await fetchTenantBrandForUser(supabase, userId)
      if (brand.businessName) name = brand.businessName
      if (brand.logoUrl) icons = [{ src: brand.logoUrl, sizes: 'any' }]
      if (brand.primary) themeColor = brand.primary
    }
  } catch {
    // Sin sesión válida o Supabase no disponible: se sirve el manifest por defecto.
  }

  return {
    name,
    short_name: name,
    description: 'Gestión de agenda, personal, inventario y finanzas para tu salón de belleza.',
    start_url: '/panel',
    display: 'standalone',
    background_color: BACKGROUND_COLOR,
    theme_color: themeColor,
    icons,
  }
}
