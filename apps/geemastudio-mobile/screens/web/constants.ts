import type { WebTemplate } from '@/types/web-landing'

/** Base pública de landings Geema-hosted (preview Mi Web). */
export const GEEMA_SITE_URL = 'https://geema.zmtechdev.com'

/** Diseños disponibles para la landing; `demoSlug` apunta a un sitio de ejemplo con datos de muestra. */
export const WEB_TEMPLATE_OPTIONS: {
  id: WebTemplate
  label: string
  description: string
  demoSlug: string
}[] = [
  {
    id: 'elegant',
    label: 'Elegant Dark',
    description: 'Fondo oscuro y acentos con degradado. Aspecto premium.',
    demoSlug: 'zm-demo-elegant',
  },
  {
    id: 'warm',
    label: 'Warm & Organic',
    description: 'Tonos cálidos y formas suaves. Cercano y acogedor.',
    demoSlug: 'zm-demo-warm',
  },
  {
    id: 'modern',
    label: 'Modern Minimal',
    description: 'Fondo claro y líneas limpias. Directo y sobrio.',
    demoSlug: 'zm-demo-modern',
  },
]

export function previewLandingUrl(slug: string): string {
  return `${GEEMA_SITE_URL}/s/${slug}`
}
