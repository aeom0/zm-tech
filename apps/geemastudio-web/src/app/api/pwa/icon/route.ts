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

          if (isMaskable) {
            // Safe zone de maskable icon en Android (círculo 66-70%).
            // Fondo con el color primario del tenant o negro Lunaris #0F0F0F.
            const innerSize = Math.round(size * 0.70)
            const resizedLogo = await sharp(buffer)
              .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png()
              .toBuffer()

            const bgColor = brand.primary || '#0F0F0F'
            const canvas = await sharp({
              create: {
                width: size,
                height: size,
                channels: 4,
                background: bgColor,
              },
            })
              .composite([
                {
                  input: resizedLogo,
                  gravity: 'center',
                },
              ])
              .png()
              .toBuffer()

            return new NextResponse(canvas, {
              headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
              },
            })
          } else {
            // Purpose: any -> Logo escalado en PNG transparente
            const pngBuffer = await sharp(buffer)
              .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png()
              .toBuffer()

            return new NextResponse(pngBuffer, {
              headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
              },
            })
          }
        }
      }
    }
  } catch (err) {
    console.error('[PWA Icon Error]', err)
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
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
