// Resolver client-safe de tasas duales BCV + USDT: lee de las tablas ya
// pobladas por el cron (RLS con SELECT). Sin fetch propio ni Node built-ins,
// valido en Next.js (browser) y React Native. El cliente Supabase se inyecta.

import { ahoraVenezuela, obtenerFechaReferenciaBCV } from './logicaBCV'
import { calcularSpreadInfo } from './spread'
import type { TasasDuales } from './types'

type FilaTasa = { fecha: string; usd: number | string; fuente?: string | null }

type QueryTasas = {
  eq: (col: string, val: string) => QueryTasas
  lte: (col: string, val: string) => QueryTasas
  gt: (col: string, val: number) => QueryTasas
  neq: (col: string, val: string) => QueryTasas
  order: (col: string, opts: { ascending: boolean }) => QueryTasas
  limit: (n: number) => QueryTasas
  maybeSingle: () => PromiseLike<{ data: FilaTasa | null; error: unknown }>
}

/** Subconjunto del cliente de supabase-js usado para leer tasas. */
export type ClienteLecturaTasas = {
  from: (tabla: string) => { select: (columnas: string) => QueryTasas }
}

export interface TablasTasas {
  bcv: string
  usdt: string
}

export const TABLAS_TASAS_HUB: TablasTasas = { bcv: 'hub_tasas_bcv', usdt: 'hub_tasas_usdt' }

/**
 * Tasa BCV vigente para hoy (fecha de referencia bancaria VE) + ultima USDT
 * hasta esa fecha. `null` si aun no hay ninguna tasa BCV persistida.
 */
export async function resolverTasasDuales(
  cliente: ClienteLecturaTasas,
  tablas: TablasTasas = TABLAS_TASAS_HUB
): Promise<TasasDuales | null> {
  const hoy = ahoraVenezuela().format('YYYY-MM-DD')
  const fechaRef = obtenerFechaReferenciaBCV(hoy)

  const { data: filaBcv } = await cliente
    .from(tablas.bcv)
    .select('fecha, usd, fuente')
    .lte('fecha', fechaRef)
    .gt('usd', 0)
    .neq('fuente', 'emergencia')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!filaBcv) return null

  const { data: filaUsdt } = await cliente
    .from(tablas.usdt)
    .select('fecha, usd, fuente')
    .eq('mercado', 'binance')
    .lte('fecha', filaBcv.fecha)
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ahora = new Date().toISOString()
  const bcvValor = parseFloat(String(filaBcv.usd))
  const bcv = {
    valor: bcvValor,
    fecha: filaBcv.fecha,
    fuente: filaBcv.fuente ?? 'bcv-oficial',
    disponible: true,
    esReferencial: filaBcv.fecha !== fechaRef,
    ultimaActualizacion: ahora,
  }

  const usdt = filaUsdt
    ? {
        valor: parseFloat(String(filaUsdt.usd)),
        fecha: filaUsdt.fecha,
        fuente: filaUsdt.fuente ?? 'usdt.com.ve',
        disponible: true,
        esReferencial: filaUsdt.fecha !== bcv.fecha,
        ultimaActualizacion: ahora,
      }
    : {
        valor: bcvValor,
        fecha: bcv.fecha,
        fuente: 'sin-tasa',
        disponible: false,
        esReferencial: true,
        ultimaActualizacion: ahora,
      }

  return {
    bcv,
    usdt,
    spread: calcularSpreadInfo(bcv.valor, usdt.valor),
    timestamp: Date.now(),
  }
}
