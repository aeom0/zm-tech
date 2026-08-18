import type { TasasDuales } from './types'

export interface RespuestaTasaApi {
  bcv?: {
    valor?: number | null
    fecha?: string
    fuente?: string
    disponible?: boolean
    esReferencial?: boolean
    ultimaActualizacion?: string
  }
  usdt?: {
    valor?: number | null
    fecha?: string
    fuente?: string
    disponible?: boolean
    esReferencial?: boolean
    ultimaActualizacion?: string
  }
  spread?: TasasDuales['spread']
  timestamp?: number
  aviso?: string
}

export function normalizarRespuestaTasaApi(
  data: RespuestaTasaApi,
  ahora = new Date().toISOString(),
): TasasDuales {
  const bcvValor = data.bcv?.valor ?? 0
  const bcvDisponible = data.bcv?.disponible ?? bcvValor > 0
  const usdtValor = data.usdt?.valor ?? bcvValor
  const usdtDisponible = data.usdt?.disponible ?? false
  const fechaBcv = data.bcv?.fecha ?? ahora.slice(0, 10)
  const fechaUsdt = data.usdt?.fecha ?? fechaBcv

  return {
    bcv: {
      valor: bcvValor,
      fecha: fechaBcv,
      fuente: data.bcv?.fuente ?? 'sin-datos',
      disponible: bcvDisponible,
      esReferencial: data.bcv?.esReferencial ?? false,
      ultimaActualizacion: data.bcv?.ultimaActualizacion ?? ahora,
    },
    usdt: {
      valor: usdtValor,
      fecha: fechaUsdt,
      fuente: usdtDisponible ? (data.usdt?.fuente ?? 'usdt.com.ve') : 'fallback-bcv',
      disponible: usdtDisponible,
      esReferencial: data.usdt?.esReferencial ?? !usdtDisponible,
      ultimaActualizacion: data.usdt?.ultimaActualizacion ?? ahora,
    },
    spread: data.spread ?? { absoluto: 0, porcentaje: 0, nivel: 'bajo' },
    timestamp: data.timestamp ?? Date.now(),
  }
}
