// Proveedor externo de tasa BCV (JSON publico, sin API key).
// Server-only: usa fetch con AbortController; se invoca desde Route Handlers
// (crons y endpoint /api/bcv/tasa), nunca desde componentes cliente ni mobile.

export interface TasaProveedorBcv {
  usd: number
  fecha: string
  fuente: 'bcv-today'
}

const FETCH_TIMEOUT_MS = 8000
const BCV_TODAY_JSON_URL = 'https://bcv.today/api/v1/rate.json'

async function fetchConTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function obtenerDesdeBcvToday(): Promise<TasaProveedorBcv | null> {
  try {
    const res = await fetchConTimeout(BCV_TODAY_JSON_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null

    const data = (await res.json()) as Record<string, unknown>
    const usd = Number(data.USD ?? data.usd)
    if (!Number.isFinite(usd) || usd <= 0) return null

    return {
      usd: parseFloat(usd.toFixed(4)),
      fecha: new Date().toISOString().split('T')[0],
      fuente: 'bcv-today',
    }
  } catch (err) {
    console.warn('[BCV] bcv.today fallo:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Unica fuente BCV gratuita en fase 1. Se deja como punto de extension
 * para agregar mas proveedores en cadena si bcv.today resulta inestable.
 */
export async function obtenerTasaDesdeProveedores(): Promise<TasaProveedorBcv | null> {
  return obtenerDesdeBcvToday()
}

export function respuestaSinTasaBcv(error: string, fechaHoy: string) {
  return {
    usd: 0,
    fecha: fechaHoy,
    fuente: 'sin-tasa' as const,
    error,
    hint: 'No hay tasa BCV disponible. Revisa el cron o registra la tasa manual en la tienda.',
  }
}
