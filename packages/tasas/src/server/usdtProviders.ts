// Proveedor externo de tasa USDT/paralelo (JSON publico, sin API key).
// Server-only. Fuente: usdt.com.ve (gratis) -- sin fallback pago (Cotizave),
// a diferencia del sistema origen, porque zm-tech no tiene esa API key.

export interface TasaProveedorUsdt {
  usd: number
  buy: number | null
  sell: number | null
  fuente: 'usdt.com.ve'
}

const USDT_COM_VE_CURRENT = 'https://www.usdt.com.ve/api/v1/rates/current'

interface UsdtComVeResponse {
  success?: boolean
  data?: {
    binance?: { buy_rate?: number; sell_rate?: number }
    captured_at?: string
  }
}

export async function obtenerTasaUsdt(): Promise<TasaProveedorUsdt | null> {
  try {
    const res = await fetch(USDT_COM_VE_CURRENT, { cache: 'no-store' })
    if (!res.ok) return null
    const json = (await res.json()) as UsdtComVeResponse
    const buy = json.data?.binance?.buy_rate
    const sell = json.data?.binance?.sell_rate
    if (!buy || buy <= 0) return null
    const mid = sell && sell > 0 ? (buy + sell) / 2 : buy
    return {
      usd: Math.round(mid * 10000) / 10000,
      buy: buy ?? null,
      sell: sell ?? null,
      fuente: 'usdt.com.ve',
    }
  } catch (err) {
    console.warn('[USDT] usdt.com.ve fallo:', err instanceof Error ? err.message : err)
    return null
  }
}
