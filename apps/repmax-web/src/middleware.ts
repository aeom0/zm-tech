import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { extraerSlugDeHostname, HEADER_VITRINA_SLUG, pathnameEsPanel } from '@/lib/vitrina-host'

function conHeaderSlug(request: NextRequest, slug: string): Headers {
  const headers = new Headers(request.headers)
  headers.set(HEADER_VITRINA_SLUG, slug)
  return headers
}

function rewriteVitrina(request: NextRequest, slug: string): NextResponse | null {
  const { pathname, search } = request.nextUrl
  if (pathnameEsPanel(pathname)) return null
  if (pathname.startsWith('/_next')) return null
  if (pathname.includes('.') && !pathname.startsWith('/p/')) return null

  const url = request.nextUrl.clone()

  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    const resto = pathname.slice(slug.length + 1)
    url.pathname = resto.length === 0 ? '/' : resto
    return NextResponse.redirect(url, 308)
  }

  const destino = pathname === '/' ? `/${slug}` : `/${slug}${pathname}`
  if (destino === pathname) {
    return NextResponse.next({
      request: { headers: conHeaderSlug(request, slug) },
    })
  }

  url.pathname = destino
  url.search = search
  return NextResponse.rewrite(url, {
    request: { headers: conHeaderSlug(request, slug) },
  })
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const slugHost = extraerSlugDeHostname(host)

  if (slugHost) {
    const vitrina = rewriteVitrina(request, slugHost)
    if (vitrina) return vitrina
  }

  const { pathname } = request.nextUrl
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const { supabaseResponse, user } = await updateSession(request)
    if (!user) {
      const login = new URL('/login', request.url)
      login.searchParams.set('from', pathname)
      return NextResponse.redirect(login)
    }
    return supabaseResponse
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
