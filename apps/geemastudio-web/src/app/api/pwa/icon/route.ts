import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchTenantBrandBySlug } from '@/lib/tenant-brand'
import path from 'path'
import fs from 'fs/promises'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tenantSlug = searchParams.get('tenant')
  const size = Math.min(Math.max(parseInt(searchParams.get('size') || '512', 10), 48), 1024)
  const isMaskable = searchParams.get('maskable') === '1' || searchParams.get('purpose') === 'maskable'

  try {
    if (tenantSlug) {
      const supabase = await createServerSupabaseClient()
      const brand = await fetchTenantBrandBySlug(supabase, tenantSlug)

      if (brand?.logoUrl) {
        const res = await fetch(brand.logoUrl, { next: { revalidate: 86400 } })
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer())

          // Los logos suelen ser blancos/transparentes: siempre se asientan sobre el
          // color primario del tenant (o negro Lunaris #0F0F0F) para que no queden
          // invisibles en el launcher. Maskable respeta la safe zone (~70%); "any"
          // y apple-touch-icon usan más área.
          const innerSize = Math.round(size * (isMaskable ? 0.7 : 0.8))
          const resizedLogo = await sharp(buffer)
            .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer()

          const canvas = await sharp({
            create: {
              width: size,
              height: size,
              channels: 4,
              background: brand.primary || '#0F0F0F',
            },
          })
            .composite([{ input: resizedLogo, gravity: 'center' }])
            .png()
            .toBuffer()

          return new NextResponse(new Uint8Array(canvas), {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=86400',
            },
          })
        }
      }
    }
  } catch (err) {
    console.error('[PWA Icon Error]', err)
  }

  if (tenantSlug) {
    console.warn(`[PWA Icon] Sin logo para el tenant "${tenantSlug}", usando ícono de GeemaStudio`)
  }

  // Fallback a los iconos estándar de GeemaStudio
  try {
    const fallbackPath = path.join(
      process.cwd(),
      'public',
      size <= 192 ? 'icon-192.png' : 'icon-512.png'
    )
    const file = await fs.readFile(fallbackPath)
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'image/png',
        'X-Pwa-Icon-Source': 'fallback',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
