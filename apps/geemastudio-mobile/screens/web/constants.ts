/** Base pública de landings Geema-hosted (preview Mi Web). */
export const GEEMA_SITE_URL = 'https://geema.zmtechdev.com'

export function previewLandingUrl(slug: string): string {
  return `${GEEMA_SITE_URL}/s/${slug}`
}
