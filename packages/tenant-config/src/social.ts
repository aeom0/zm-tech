export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok'

const HOST: Record<SocialPlatform, string> = {
  instagram: 'instagram.com',
  facebook: 'facebook.com',
  tiktok: 'tiktok.com',
}

/**
 * Convierte lo que escribió el negocio (`@usuario`, `usuario` o una URL completa)
 * en el enlace al perfil. Devuelve null si el valor está vacío.
 */
export function socialProfileUrl(platform: SocialPlatform, raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (/^(www\.)?(instagram|facebook|tiktok)\.com\//i.test(value)) return `https://${value}`
  const handle = value.replace(/^@/, '').replace(/\s+/g, '')
  if (!handle) return null
  return platform === 'tiktok'
    ? `https://${HOST.tiktok}/@${handle}`
    : `https://${HOST[platform]}/${handle}`
}
