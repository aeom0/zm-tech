import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchTenantBrandForUser, fetchTenantBrandBySlug, type TenantBrand } from '@/lib/tenant-brand'
import { DEFAULT_TENANT_PRIMARY } from '@/lib/tenant-theme'

export const dynamic = 'force-dynamic'

const BACKGROUND_COLOR = '#0F0F0F'

const FALLBACK_ICONS = [
  {
    src: '/icon-192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
  {
    src: '/favicon.png',
    sizes: 'any',
    type: 'image/png',
  },
]

export async function GET(request: NextRequest) {
  let name = 'GeemaStudio'
  let icons = FALLBACK_ICONS
  let themeColor = DEFAULT_TENANT_PRIMARY

  try {
    const { searchParams } = request.nextUrl
    const tenantParam = searchParams.get('tenant')

    const supabase = await createServerSupabaseClient()
    let brand: TenantBrand | null = null
    let tenantSlug = tenantParam

    if (tenantParam) {
      brand = await fetchTenantBrandBySlug(supabase, tenantParam)
    } else {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id
      if (userId) {
        brand = await fetchTenantBrandForUser(supabase, userId)
        tenantSlug = brand.tenantSlug || null
      }
    }

    if (brand?.businessName) {
      name = brand.businessName
    }

    if (tenantSlug && brand?.logoUrl) {
      icons = [
        {
          src: `/api/pwa/icon?tenant=${tenantSlug}&size=192`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/api/pwa/icon?tenant=${tenantSlug}&size=512`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/api/pwa/icon?tenant=${tenantSlug}&size=512&maskable=1`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        ...FALLBACK_ICONS,
      ]
    }

    if (brand?.primary) {
      themeColor = brand.primary
    }
  } catch (err) {
    console.error('[Manifest Route Error]', err)
  }

  const manifest = {
    name,
    short_name: name,
    description: 'Gestión de agenda, personal, inventario y finanzas para tu salón de belleza.',
    start_url: '/panel',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: BACKGROUND_COLOR,
    theme_color: themeColor,
    icons,
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
