import { esSlugVitrinaValido } from '@repmax/repmax-schema/vitrinaSlug'

/** Dominio apex de vitrinas. El proyecto landing (`zmtech`) sigue dueño del apex. */
export const VITRINA_ROOT_DOMAIN_DEFAULT = 'zmtechdev.com'

export const HEADER_VITRINA_SLUG = 'x-vitrina-slug'

export function raizVitrina(): string {
  const env = process.env.NEXT_PUBLIC_VITRINA_ROOT_DOMAIN?.trim().toLowerCase()
  return env && env.length > 0 ? env : VITRINA_ROOT_DOMAIN_DEFAULT
}

/** Enciende URLs canónicas `https://{slug}.zmtechdev.com` (QR, WhatsApp, panel). */
export function subdominiosPublicosActivos(): boolean {
  return process.env.NEXT_PUBLIC_VITRINA_SUBDOMAINS === '1'
}

/**
 * Si el Host es `{slug}.zmtechdev.com` o `{slug}.localhost`, devuelve el slug.
 * Preview `*.vercel.app` y `localhost` (sin subdominio) → null (se usa /{slug}).
 */
export function extraerSlugDeHostname(hostHeader: string): string | null {
  const host = hostHeader.split(':')[0]?.trim().toLowerCase() ?? ''
  if (!host) return null
  if (host.endsWith('.vercel.app')) return null

  if (host.endsWith('.localhost')) {
    const slug = host.slice(0, -'.localhost'.length)
    return esSlugVitrinaValido(slug) ? slug : null
  }

  const raiz = raizVitrina()
  if (host === raiz || host === `www.${raiz}`) return null
  if (!host.endsWith(`.${raiz}`)) return null

  const slug = host.slice(0, -(raiz.length + 1))
  if (slug.includes('.')) return null
  return esSlugVitrinaValido(slug) ? slug : null
}

export function pathCatalogoVitrina(storeSlug: string, hostSlug: string | null): string {
  return hostSlug === storeSlug ? '/' : `/${storeSlug}`
}

export function pathProductoVitrina(
  storeSlug: string,
  productId: string,
  hostSlug: string | null
): string {
  return hostSlug === storeSlug ? `/p/${productId}` : `/${storeSlug}/p/${productId}`
}

export function pathnameEsPanel(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/api/')
  )
}
