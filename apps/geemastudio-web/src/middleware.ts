import { NextRequest, NextResponse } from 'next/server'

/**
 * Hosts de la plataforma GeemaStudio (panel + `/s/[slug]` + resto de rutas).
 * Cualquier otro host se trata como `custom_domain` de un tenant.
 */
const PLATFORM_HOSTNAMES = ['geema.zmtechdev.com', 'localhost', '127.0.0.1']

function isPlatformHost(hostname: string): boolean {
  return PLATFORM_HOSTNAMES.includes(hostname) || hostname.endsWith('.vercel.app')
}

/**
 * Dominio propio de un tenant (Fase 3, `WEB_ARCHITECTURE.md` §Modo A): solo la
 * raíz se reescribe hacia la landing pública (`/_sites/[domain]`). Cualquier
 * otra ruta (incluido `/panel`, `/dashboard`, `/finanzas`, `/login`, `/api`)
 * se bloquea con 404 — el panel de gestión NUNCA se sirve bajo el dominio del
 * tenant, sin importar que la ruta exista en la app.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const hostname = host.split(':')[0]

  if (isPlatformHost(hostname)) {
    return NextResponse.next()
  }

  if (request.nextUrl.pathname !== '/') {
    return new NextResponse('Not found', { status: 404 })
  }

  const url = request.nextUrl.clone()
  url.pathname = `/_sites/${hostname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
