import { raizVitrina, subdominiosPublicosActivos } from '@/lib/vitrina-host'

/** URL base del sitio RepMAX (panel y vitrina por ruta). */

export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
  if (env?.startsWith('http')) return env.replace(/\/$/, '')
  if (env) return `https://${env}`
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:3003'
}

/** Link público de la vitrina. Con `NEXT_PUBLIC_VITRINA_SUBDOMAINS=1` usa `{slug}.zmtechdev.com`. */
export function urlVitrinaTienda(slug: string, siteUrl?: string): string {
  if (subdominiosPublicosActivos()) {
    return `https://${slug}.${raizVitrina()}`
  }
  const base = (siteUrl ?? getSiteUrl()).replace(/\/$/, '')
  return `${base}/${slug}`
}
