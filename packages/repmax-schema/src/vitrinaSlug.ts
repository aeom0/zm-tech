/** Subdominios y rutas de app que no pueden ser slug de tienda. */
export const SLUGS_RESERVADOS_VITRINA = [
  'www',
  'app',
  'api',
  'dashboard',
  'login',
  'admin',
  'mail',
  'cdn',
  'status',
  'docs',
  'staging',
  'preview',
  'repmax',
  'web',
  'ftp',
  'test',
] as const

export function esSlugReservadoVitrina(slug: string): boolean {
  return (SLUGS_RESERVADOS_VITRINA as readonly string[]).includes(slug.trim().toLowerCase())
}

/** Slug usable en `/{slug}` y `{slug}.zmtechdev.com`. */
export function esSlugVitrinaValido(slug: string): boolean {
  const s = slug.trim().toLowerCase()
  if (s.length < 2 || s.length > 63) return false
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return false
  return !esSlugReservadoVitrina(s)
}
