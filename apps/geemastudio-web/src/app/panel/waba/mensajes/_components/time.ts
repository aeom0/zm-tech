/** True si la clave del hilo es BSUID de Meta (sin teléfono E.164). */
export function isWaBsuidKey(phone: string | null | undefined): boolean {
  return typeof phone === 'string' && /^[A-Z]{2}\./.test(phone.trim())
}

/**
 * Formatea un teléfono E.164 a algo legible sin asumir país fijo
 * (multi-tenant: no hardcodear "+51" ni ningún prefijo de negocio).
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  if (isWaBsuidKey(phone)) return 'Sin teléfono'
  const digits = phone.replace(/\D/g, '')
  if (!digits) return phone
  const ccLen = digits.length > 10 ? digits.length - 9 : Math.min(2, Math.max(1, digits.length - 3))
  const cc = digits.slice(0, ccLen)
  const rest = digits.slice(ccLen)
  const groups = rest.match(/.{1,3}/g) ?? [rest]
  return `+${cc} ${groups.join(' ')}`.trim()
}

export function formatRelativeTime(iso: string): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return ''

  const diffMs = Date.now() - ts
  const diffSec = Math.round(diffMs / 1000)
  const abs = Math.abs(diffSec)

  const d = new Date(ts)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (sameDay && abs < 60) return 'hace 1 min'

  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

  if (abs < 60) return rtf.format(-Math.max(1, abs), 'second')
  if (abs < 60 * 60) return rtf.format(-Math.round(abs / 60), 'minute')
  if (abs < 60 * 60 * 24) return rtf.format(-Math.round(abs / 3600), 'hour')
  if (abs < 60 * 60 * 24 * 7) return rtf.format(-Math.round(abs / 86400), 'day')

  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

/** Fecha + hora absolutas, para mostrar junto al relativo (no lo reemplaza). */
export function formatAbsoluteWhen(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
