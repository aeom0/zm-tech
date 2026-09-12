/** Host público de la plataforma (panel + `/s/[slug]`). */
export const SITE_URL_DEFAULT_PROD = 'https://geema.zmtechdev.com'

/**
 * URL canónica del sitio GeemaStudio.
 * Prod temporal: `https://geema.zmtechdev.com` hasta dominio propio (`geemastudio.app`).
 * Local: cae a `http://localhost:3000` si no hay env.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (process.env.NODE_ENV === 'production') return SITE_URL_DEFAULT_PROD
  return 'http://localhost:3000'
}

/** Landing pública de un tenant en modo geema_hosted. */
export function getTenantLandingUrl(slug: string): string {
  const clean = slug.trim().replace(/^\/+|\/+$/g, '')
  return `${getSiteUrl()}/s/${clean}`
}
