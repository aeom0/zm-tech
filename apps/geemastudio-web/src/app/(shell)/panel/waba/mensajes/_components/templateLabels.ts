/**
 * Nombre técnico de plantilla Meta → etiqueta legible en el panel.
 * Sin mapa hardcodeado por tenant: solo normaliza el slug crudo.
 */
export function friendlyTemplateName(slug: string): string {
  const key = slug.trim().toLowerCase()
  const base = key.replace(/_(zm|geema)$/, '').replace(/_/g, ' ').trim()
  if (!base) return 'Plantilla'
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/**
 * Parsea contenido guardado como `[plantilla:slug] body` y devuelve
 * la etiqueta humana + body (sin el slug técnico).
 */
export function formatTemplatePreview(content: string): string {
  const raw = (content || '').trim()
  if (!raw) return 'Plantilla'

  const match = raw.match(/^\[plantilla:([^\]]+)\]\s*(.*)$/i)
  if (!match) return raw

  const label = friendlyTemplateName(match[1])
  const body = match[2]?.trim()
  return body ? `${label} · ${body}` : label
}

export function isTemplateContent(content: string, msgType?: string): boolean {
  if (msgType === 'template') return true
  return /^\[plantilla:/i.test(content || '')
}
