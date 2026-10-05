import type { TablasTasas } from '@zmtech/tasas'

/** Tablas de tasas VE en el proyecto Geema (ver migración *_exchange_rates_ve.sql). */
export const TABLAS_TASAS: TablasTasas = {
  bcv: 'exchange_rates_bcv',
  usdt: 'exchange_rates_usdt',
}

export const CACHE_TASAS_TTL_MS = 30 * 60 * 1000
