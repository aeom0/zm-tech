import { defaultTenantConfig } from './defaults'
import type { TenantConfig } from './types'
import {
  resolveFranjaEfectiva,
  type SalonHolidayIndex,
} from './salon-holidays'

/** Claves de día alineadas con JSON guardado en `business_hours` (sin tildes). */
export const CLAVES_DIA_LABORAL = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const

export type DiaLaboralKey = (typeof CLAVES_DIA_LABORAL)[number]

export const ETIQUETA_DIA_LABORAL: Record<DiaLaboralKey, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}

/** Zonas horarias IANA frecuentes en LATAM (configuración guiada; se puede ampliar). */
export const ZONAS_HORARIAS_SUGERIDAS: ReadonlyArray<{
  value: string
  label: string
}> = [
  { value: 'America/Caracas', label: 'Caracas (Venezuela)' },
  { value: 'America/Lima', label: 'Lima (Perú)' },
  { value: 'America/Bogota', label: 'Bogotá, Quito (COL/EC)' },
  { value: 'America/La_Paz', label: 'La Paz' },
  { value: 'America/Santiago', label: 'Santiago' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
  { value: 'America/Mexico_City', label: 'Ciudad de México' },
  { value: 'America/Guatemala', label: 'Guatemala, San José, Tegucigalpa' },
  { value: 'America/Panama', label: 'Panamá' },
  { value: 'America/Santo_Domingo', label: 'Santo Domingo' },
  { value: 'America/San_Juan', label: 'San Juan' },
  { value: 'America/New_York', label: 'Este EE. UU. (Miami, Nueva York)' },
]

const HH_MM = /^([01]?\d|2[0-3]):([0-5]\d)$/

export function esHoraValidaHHMM(valor: string): boolean {
  return HH_MM.test(valor.trim())
}

/** Mensaje de error en español, o `null` si el horario semanal es válido. */
export function validarHorarioCompleto(bh: TenantConfig['businessHours']): string | null {
  for (const key of CLAVES_DIA_LABORAL) {
    const slot = bh[key]
    if (slot === null || slot === undefined) continue
    const open = slot.open.trim()
    const close = slot.close.trim()
    if (!esHoraValidaHHMM(open) || !esHoraValidaHHMM(close)) {
      return `Formato HH:MM en ${ETIQUETA_DIA_LABORAL[key]} (ej. 09:30).`
    }
    const [oh, om] = open.split(':').map(Number)
    const [ch, cm] = close.split(':').map(Number)
    if (oh * 60 + om >= ch * 60 + cm) {
      return `En ${ETIQUETA_DIA_LABORAL[key]} la hora de apertura debe ser menor que el cierre.`
    }
  }
  return null
}

/**
 * `Date.getDay()`: 0 = domingo … 6 = sábado — alineado con claves de `business_hours`.
 */
const DIA_JS_A_CLAVE_LABORAL: readonly DiaLaboralKey[] = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
] as const

export function diaLaboralKeyDesdeFechaLocal(date: Date): DiaLaboralKey {
  return DIA_JS_A_CLAVE_LABORAL[date.getDay()]!
}

function minutosDesdeMedianoche(hhmm: string): number {
  const parts = hhmm.trim().split(':')
  const h = parseInt(parts[0] ?? '', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return NaN
  }
  return h * 60 + m
}

/**
 * Igual que `esCeldaAgendaEnHorarioLaboral` pero con precisión de minuto — para
 * validar un horario elegido con chips de 15 min (no solo la celda de hora entera).
 * Si se pasa `holidays`, feriado cerrado → false; feriado abierto → ventana 10–openUntil.
 */
export function esInstanteEnHorarioLaboral(
  fechaColumna: Date,
  minutoDelDia: number,
  businessHours: TenantConfig['businessHours'],
  timeZone: string,
  holidays?: SalonHolidayIndex
): boolean {
  const franja = resolveFranjaEfectiva(fechaColumna, businessHours, holidays, timeZone)
  if (!franja) return false
  const openM = minutosDesdeMedianoche(franja.open)
  const closeM = minutosDesdeMedianoche(franja.close)
  if (!Number.isFinite(openM) || !Number.isFinite(closeM) || closeM <= openM) {
    return false
  }
  return minutoDelDia >= openM && minutoDelDia < closeM
}

/**
 * Celda de agenda = intervalo [hour:00, hour+1:00) en la fecha de la columna,
 * interpretado en la zona IANA del negocio (coincide con citas en BD como instantes).
 */
export function esCeldaAgendaEnHorarioLaboral(
  fechaColumna: Date,
  horaInicio: number,
  businessHours: TenantConfig['businessHours'],
  timeZone: string,
  holidays?: SalonHolidayIndex
): boolean {
  const franja = resolveFranjaEfectiva(fechaColumna, businessHours, holidays, timeZone)
  if (!franja) return false
  const openM = minutosDesdeMedianoche(franja.open)
  const closeM = minutosDesdeMedianoche(franja.close)
  if (!Number.isFinite(openM) || !Number.isFinite(closeM) || closeM <= openM) {
    return false
  }
  const slotStart = horaInicio * 60
  const slotEnd = slotStart + 60
  return slotStart < closeM && slotEnd > openM
}

/**
 * Horas enteras que cubren el horario laboral configurado (unión de todos los
 * días con franja activa), sin margen — cada hora devuelta se muestra con su
 * etiqueta en la grilla de agenda. Ver `AGENDA_BORDE_VISUAL_MIN` para el
 * espacio visual extra (sin etiqueta) que la UI agrega antes/después.
 */
export function horasVisiblesParaAgenda(
  businessHours: TenantConfig['businessHours'] | null | undefined
): number[] {
  const n = normalizarHorarioSemanal(businessHours)
  let lo = Infinity
  let hi = -Infinity
  let hayAlguno = false
  for (const key of CLAVES_DIA_LABORAL) {
    const franja = n[key]
    if (!franja) continue
    const openM = minutosDesdeMedianoche(franja.open)
    const closeM = minutosDesdeMedianoche(franja.close)
    if (!Number.isFinite(openM) || !Number.isFinite(closeM) || closeM <= openM) {
      continue
    }
    hayAlguno = true
    lo = Math.min(lo, Math.floor(openM / 60))
    hi = Math.max(hi, Math.floor((closeM - 1) / 60))
  }
  if (!hayAlguno) {
    return Array.from({ length: 10 }, (_, i) => i + 10)
  }
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
}

/**
 * Minutos de espacio visual (sin hora etiquetada) que la grilla de agenda
 * agrega antes de la primera hora y después de la última — cubre casos como
 * una cita agendada 30 min antes/después del horario configurado por
 * excepción, sin que la grilla muestre una hora fuera de servicio.
 */
export const AGENDA_BORDE_VISUAL_MIN = 30

export function diaTieneFranjaAgenda(
  fecha: Date,
  agendaHours: readonly number[],
  businessHours: TenantConfig['businessHours'],
  timeZone: string,
  holidays?: SalonHolidayIndex
): boolean {
  return agendaHours.some((h) =>
    esCeldaAgendaEnHorarioLaboral(fecha, h, businessHours, timeZone, holidays)
  )
}

/**
 * Fusiona actualización parcial sin pisar objetos anidados por completo
 * (p. ej. solo `locale.timezone` conserva moneda e idioma).
 */
export function mergeTenantConfig(
  prev: TenantConfig,
  partial: Partial<TenantConfig>
): TenantConfig {
  return {
    ...prev,
    ...partial,
    theme: partial.theme ? { ...prev.theme, ...partial.theme } : prev.theme,
    locale: partial.locale
      ? {
          ...prev.locale,
          ...partial.locale,
          currency: partial.locale.currency
            ? {
                ...prev.locale.currency,
                ...partial.locale.currency,
              }
            : prev.locale.currency,
        }
      : prev.locale,
    terminology: partial.terminology
      ? { ...prev.terminology, ...partial.terminology }
      : prev.terminology,
    contact: partial.contact ? { ...prev.contact, ...partial.contact } : prev.contact,
    businessHours: partial.businessHours !== undefined ? partial.businessHours : prev.businessHours,
    commissions: partial.commissions
      ? { ...prev.commissions, ...partial.commissions }
      : prev.commissions,
    features: partial.features ? { ...prev.features, ...partial.features } : prev.features,
    isDemo: partial.isDemo !== undefined ? partial.isDemo : prev.isDemo,
    integrations: partial.integrations
      ? { ...prev.integrations, ...partial.integrations }
      : prev.integrations,
    supabase: partial.supabase ?? prev.supabase,
  }
}

/** Rellena los 7 días con defaults cuando falten claves en BD. */
export function normalizarHorarioSemanal(
  hours: TenantConfig['businessHours'] | null | undefined
): TenantConfig['businessHours'] {
  const base: TenantConfig['businessHours'] = {
    ...defaultTenantConfig.businessHours,
  }
  if (!hours || typeof hours !== 'object') {
    return base
  }
  for (const key of CLAVES_DIA_LABORAL) {
    if (Object.prototype.hasOwnProperty.call(hours, key)) {
      const v = hours[key]
      base[key] = v === undefined ? base[key] : v
    }
  }
  return base
}
