import { headers } from 'next/headers'
import { extraerSlugDeHostname, HEADER_VITRINA_SLUG } from '@/lib/vitrina-host'

/** Slug del Host de vitrina, o null si la request va por `/{slug}`. */
export async function leerSlugHostVitrina(): Promise<string | null> {
  const h = await headers()
  const porHeader = h.get(HEADER_VITRINA_SLUG)?.trim()
  if (porHeader) return porHeader

  const host = h.get('x-forwarded-host') ?? h.get('host') ?? ''
  return extraerSlugDeHostname(host)
}
