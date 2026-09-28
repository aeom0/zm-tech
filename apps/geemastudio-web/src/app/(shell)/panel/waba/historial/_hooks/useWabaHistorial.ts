'use client'

import { useQuery } from '@tanstack/react-query'
import { format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { supabase } from '@/lib/supabase'

const LIMA = 'America/Lima'

/** Tope de filas cargadas por consulta (rendimiento en panel). */
export const WABA_HISTORIAL_MSG_CAP = 5000

/** Estimación de costo en USD (tarifas públicas de referencia Haiku). */
const HAIKU_INPUT_PER_TOKEN = 0.00000025
const HAIKU_OUTPUT_PER_TOKEN = 0.00000125

export type HistorialPeriod = '7d' | '30d' | '90d'

export interface VolumeDatum {
  dateKey: string
  label: string
  recibidos: number
  enviados: number
}

export interface HistorialSummary {
  mensajesRecibidos: number
  clientesUnicos: number
  respuestasBot: number
}

export interface HeatmapCell {
  diaSemana: number // 0 = lunes … 6 = domingo
  hora: number
  count: number
}

export interface FlowDatum {
  paso: string
  etiqueta: string
  /** false = valor del sistema sin ficha amigable; mostrar en cursiva */
  etiquetaFija: boolean
  count: number
}

export interface HaikuHistorial {
  llamadas: number
  tokensEntrada: number
  tokensSalida: number
  costoEstimadoUSD: number
  sinTabla: boolean
}

function periodDays(p: HistorialPeriod): number {
  switch (p) {
    case '7d':
      return 7
    case '30d':
      return 30
    case '90d':
      return 90
  }
}

export function inicioPeriodoIso(period: HistorialPeriod): string {
  const fin = new Date()
  const ms = periodDays(period) * 24 * 60 * 60 * 1000
  return new Date(fin.getTime() - ms).toISOString()
}

function limaZoned(iso: string): Date {
  return toZonedTime(parseISO(iso), LIMA)
}

function claveDiaLima(iso: string): string {
  return format(limaZoned(iso), 'yyyy-MM-dd')
}

function claveSemanaLima(iso: string): string {
  const z = limaZoned(iso)
  const inicio = startOfWeek(z, { weekStartsOn: 1 })
  return format(inicio, 'yyyy-MM-dd')
}

function fechaMedioDiaLima(dateKey: string): Date {
  return parseISO(`${dateKey}T12:00:00-05:00`)
}

function construirVolumen(
  rows: Array<{ direction: string; created_at: string }>,
  period: HistorialPeriod,
): VolumeDatum[] {
  const porSemana = period === '90d'
  const map = new Map<string, { recibidos: number; enviados: number }>()

  for (const row of rows) {
    const key = porSemana ? claveSemanaLima(row.created_at) : claveDiaLima(row.created_at)
    const cur = map.get(key) ?? { recibidos: 0, enviados: 0 }
    if (row.direction === 'in') cur.recibidos += 1
    else if (row.direction === 'out') cur.enviados += 1
    map.set(key, cur)
  }

  const keys = [...map.keys()].sort()
  return keys.map((dateKey) => {
    const v = map.get(dateKey)!
    const base = fechaMedioDiaLima(dateKey)
    const label = porSemana
      ? `Sem ${format(base, 'd MMM', { locale: es })}`
      : format(base, 'EEE d', { locale: es })
    return { dateKey, label, recibidos: v.recibidos, enviados: v.enviados }
  })
}

function construirResumen(rows: Array<{ direction: string; phone: string }>): HistorialSummary {
  let mensajesRecibidos = 0
  let respuestasBot = 0
  const telefonos = new Set<string>()

  for (const row of rows) {
    if (row.direction === 'in') {
      mensajesRecibidos += 1
      if (row.phone) telefonos.add(row.phone)
    } else if (row.direction === 'out') {
      respuestasBot += 1
    }
  }

  return {
    mensajesRecibidos,
    clientesUnicos: telefonos.size,
    respuestasBot,
  }
}

function construirHeatmap(rows: Array<{ direction: string; created_at: string }>): HeatmapCell[] {
  const map = new Map<string, number>()

  for (const row of rows) {
    if (row.direction !== 'in') continue
    const z = limaZoned(row.created_at)
    const jsDow = z.getDay()
    const lunes0 = (jsDow + 6) % 7
    const hour = z.getHours()
    const k = `${lunes0}-${hour}`
    map.set(k, (map.get(k) ?? 0) + 1)
  }

  const out: HeatmapCell[] = []
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const count = map.get(`${d}-${h}`) ?? 0
      out.push({ diaSemana: d, hora: h, count })
    }
  }
  return out
}

export function normalizarPasoFlujo(raw: unknown): string {
  if (raw == null || raw === '') return 'null'
  const s = String(raw).trim()
  return s === '' ? 'null' : s
}

/** Etiquetas genéricas (multi-vertical); pasos desconocidos se muestran en crudo. */
const ETIQUETAS_PASO: Record<string, string> = {
  null: 'Primer contacto',
  browsing: 'Explorando el menú',
  selecting_date: 'Eligiendo fecha',
  selecting_time: 'Eligiendo hora',
  awaiting_payment_screenshot: 'Enviando comprobante',
  awaiting_pre_service_photo: 'Enviando foto previa',
  cart: 'En el carrito',
}

function etiquetaFlujo(paso: string): { texto: string; fija: boolean } {
  if (Object.prototype.hasOwnProperty.call(ETIQUETAS_PASO, paso)) {
    return { texto: ETIQUETAS_PASO[paso]!, fija: true }
  }
  return { texto: paso, fija: false }
}

function topFlujosDesdeRows(
  rows: Array<{ step_before: string | null; direction: string }>,
): FlowDatum[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (row.direction !== 'in') continue
    const paso = normalizarPasoFlujo(row.step_before)
    counts.set(paso, (counts.get(paso) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([paso, count]) => {
      const { texto, fija } = etiquetaFlujo(paso)
      return {
        paso,
        etiqueta: texto,
        etiquetaFija: fija,
        count,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

async function fetchHaiku(desdeIso: string): Promise<HaikuHistorial> {
  if (!supabase) {
    return {
      llamadas: 0,
      tokensEntrada: 0,
      tokensSalida: 0,
      costoEstimadoUSD: 0,
      sinTabla: false,
    }
  }

  try {
    const { data, error } = await supabase
      .from('ai_usage_log')
      .select('input_tokens, output_tokens')
      .gte('created_at', desdeIso)
      .limit(WABA_HISTORIAL_MSG_CAP)

    if (error) {
      const msg = String((error as { message?: string }).message ?? '')
      if (
        msg.includes('does not exist') ||
        msg.includes('schema cache') ||
        (error as { code?: string }).code === '42P01'
      ) {
        return {
          llamadas: 0,
          tokensEntrada: 0,
          tokensSalida: 0,
          costoEstimadoUSD: 0,
          sinTabla: true,
        }
      }
      console.warn('[WABA historial] No se pudo leer el uso del asistente:', error)
      return {
        llamadas: 0,
        tokensEntrada: 0,
        tokensSalida: 0,
        costoEstimadoUSD: 0,
        sinTabla: false,
      }
    }

    const rows = (data ?? []) as Array<{
      input_tokens?: number
      output_tokens?: number
    }>
    let tokensEntrada = 0
    let tokensSalida = 0
    for (const r of rows) {
      tokensEntrada += Number(r.input_tokens) || 0
      tokensSalida += Number(r.output_tokens) || 0
    }
    const costoEstimadoUSD =
      tokensEntrada * HAIKU_INPUT_PER_TOKEN + tokensSalida * HAIKU_OUTPUT_PER_TOKEN

    return {
      llamadas: rows.length,
      tokensEntrada,
      tokensSalida,
      costoEstimadoUSD,
      sinTabla: false,
    }
  } catch (e) {
    console.warn('[WABA historial] uso asistente:', e)
    return {
      llamadas: 0,
      tokensEntrada: 0,
      tokensSalida: 0,
      costoEstimadoUSD: 0,
      sinTabla: false,
    }
  }
}

export function useWabaHistorial(period: HistorialPeriod) {
  const desdeIso = inicioPeriodoIso(period)

  const volumeQuery = useQuery({
    queryKey: ['web_waba_historial_volume', period],
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { data, error } = await supabase
        .from('wa_messages')
        .select('direction, created_at, phone')
        .gte('created_at', desdeIso)
        .order('created_at', { ascending: false })
        .limit(WABA_HISTORIAL_MSG_CAP)

      if (error) throw error
      const rows = (data ?? []) as Array<{
        direction: string
        created_at: string
        phone: string
      }>

      return {
        series: construirVolumen(rows, period),
        resumen: construirResumen(rows),
        heatmap: construirHeatmap(rows),
        totalMuestra: rows.length,
        mensajesEntrantes: rows.filter((r) => r.direction === 'in').length,
      }
    },
  })

  const haikuQuery = useQuery({
    queryKey: ['web_waba_historial_haiku', period],
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchHaiku(desdeIso),
  })

  const flowsQuery = useQuery({
    queryKey: ['web_waba_historial_flows', period],
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { data, error } = await supabase
        .from('wa_messages')
        .select('step_before, direction, created_at')
        .eq('direction', 'in')
        .gte('created_at', desdeIso)
        .order('created_at', { ascending: false })
        .limit(WABA_HISTORIAL_MSG_CAP)

      if (error) throw error
      const rows = (data ?? []) as Array<{
        step_before: string | null
        direction: string
        created_at: string
      }>
      return topFlujosDesdeRows(rows)
    },
  })

  return { volumeQuery, haikuQuery, flowsQuery, period }
}
