// format.ts — Formateo de datos

import { getUtcOffsetHours } from './lib/timezone.ts'

export const LIST_TITLE_MAX = 24

export function toLimaLocalTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

/** Timestamp local wall-clock en zona IANA (columna appointments.date sin tz). */
export function toZonedLocalTimestamp(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

export function parseLimaLocalToDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const s = dateStr.replace('T', ' ').trim()
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  const [, y, m, d, h, min, sec] = match
  const year = parseInt(y!, 10)
  const month = parseInt(m!, 10) - 1
  const day = parseInt(d!, 10)
  // America/Lima sin DST: UTC−5 fijo (legacy parseLimaLocalToDate).
  const hour = parseInt(h!, 10) + 5
  const minute = parseInt(min!, 10)
  const second = parseInt(sec ?? '0', 10)
  return new Date(Date.UTC(year, month, day, hour, minute, second))
}

/** Igual que parseLimaLocalToDate pero con offset actual del tenant (sin DST fino). */
export function parseTenantLocalToDate(
  dateStr: string | null | undefined,
  timezone: string
): Date | null {
  if (!dateStr) return null
  const s = dateStr.replace('T', ' ').trim()
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  const [, y, m, d, h, min, sec] = match
  const year = parseInt(y!, 10)
  const month = parseInt(m!, 10) - 1
  const day = parseInt(d!, 10)
  const off = getUtcOffsetHours(timezone)
  const hour = parseInt(h!, 10) + off
  const minute = parseInt(min!, 10)
  const second = parseInt(sec ?? '0', 10)
  return new Date(Date.UTC(year, month, day, hour, minute, second))
}

export function truncateListTitle(text: string, max: number = LIST_TITLE_MAX): string {
  const t = (text ?? '').trim()
  if (t.length <= max) return t
  const slice = t.slice(0, max - 1)
  const lastSpace = slice.lastIndexOf(' ')
  const out = lastSpace > max * 0.5 ? slice.slice(0, lastSpace) : slice
  return out + '…'
}

export function formatDateShort(date: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ]
  const d = date.getDate()
  const dayName = days[date.getDay()]
  const month = months[date.getMonth()]
  return `${dayName} ${d} ${month}`
}

export function formatSoles(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0,00'
  try {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  } catch {
    const fixed = value.toFixed(decimals)
    const [intPart, decPart] = fixed.split('.')
    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return decPart ? `${withThousands},${decPart}` : withThousands
  }
}

export function formatMoney(amount: number, currencyCode: string): string {
  if (!Number.isFinite(amount)) return '—'
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return formatSoles(amount)
  }
}

function hour12(hour24: number, minutes: number = 0): string {
  const h = hour24 % 24
  const m = Math.min(59, Math.max(0, minutes))
  const isPm = h >= 12
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const mm = String(m).padStart(2, '0')
  return `${h12}:${mm} ${isPm ? 'PM' : 'AM'}`
}

export function formatDateSpanish(date: Date, timezone = 'America/Lima'): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  const zoned = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  const timeStr = hour12(zoned.getHours(), zoned.getMinutes())
  return `${days[zoned.getDay()]} ${zoned.getDate()} de ${months[zoned.getMonth()]} a las ${timeStr}`
}

export function formatCartSummary(
  services: { name: string; price: string; duration: number }[],
  currencyCode: string
): string {
  if (services.length === 0) return 'Tu selección está vacía.'
  let total = 0
  let text = '🛒 *Tu selección:*\n\n'
  for (const s of services) {
    const p = parseFloat(String(s.price))
    total += p
    text += `• ${s.name} — ${formatMoney(p, currencyCode)}\n`
  }
  return text + `\n*Total: ${formatMoney(total, currencyCode)}*`
}

export interface CartLine {
  name: string
  quantity: number
  unitPrice: number
  duration?: number
}

export function formatCartSummaryFromLines(lines: CartLine[], currencyCode: string): string {
  if (lines.length === 0) return 'Tu selección está vacía.'
  let total = 0
  let text = '🛒 *Tu selección:*\n\n'
  for (const l of lines) {
    const lineTotal = l.quantity * l.unitPrice
    total += lineTotal
    const qty = l.quantity > 1 ? `${l.quantity} × ` : ''
    text += `• ${qty}${l.name} — ${formatMoney(lineTotal, currencyCode)}\n`
  }
  return text + `\n*Total: ${formatMoney(total, currencyCode)}*`
}

export function orderedServicesFromIds<T extends { id: string }>(
  ids: string[],
  uniqueServices: T[]
): T[] {
  const map = new Map(uniqueServices.map((s) => [s.id, s]))
  return ids.map((id) => map.get(id)).filter(Boolean) as T[]
}

/** Si la hora local del negocio cae dentro de franjas WABA (arrays de horas enteras). */
export function isBusinessHoursForSlots(
  weekdaySlots: number[],
  sundaySlots: number[],
  timezone: string
): boolean {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  const hour = local.getHours()
  const day = local.getDay()
  const slots = day === 0 ? sundaySlots : weekdaySlots
  if (slots.length === 0) return true
  const minH = Math.min(...slots)
  const maxH = Math.max(...slots)
  return hour >= minH && hour <= maxH
}

export function getMenuResponse(option: string): string {
  const l = option.toLowerCase().trim()
  if (l === 'agendar_cita' || l === '2' || l.includes('agendar') || l.includes('cita')) {
    return '📅 *Agendar cita*\n\nSelecciona *Ver servicios* para elegir uno o más servicios y luego podrás agendar.'
  }
  if (l === 'horarios' || l === '3' || l.includes('horario')) {
    return '🕐 *Horarios*\n\nConsulta los horarios en el menú de tu negocio o escribe *menu* para más opciones.'
  }
  if (l === 'ubicacion' || l === '4' || l.includes('ubicaci') || l.includes('donde')) {
    return '📍 *Ubicación*\n\nPide la dirección al equipo o revisa los datos de contacto en el menú.'
  }
  return 'No entendí tu mensaje 🫶 Escribe *menu* para ver las opciones disponibles.'
}
