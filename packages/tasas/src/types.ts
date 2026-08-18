// Tipos para el sistema de tasas duales BCV (oficial) + USDT (paralelo).
// Client-safe: sin fetch, sin dependencias de Node/Supabase.

export type NivelSpread = 'bajo' | 'medio' | 'alto' | 'critico'
// bajo     < 10%   -> todo bien
// medio    10-20%  -> atencion
// alto     20-35%  -> margen real se comprime significativamente
// critico  > 35%   -> riesgo de perdida si precios no se ajustan

export interface TasaIndividual {
  valor: number // Bs por USD/USDT
  fecha: string // YYYY-MM-DD
  fuente: string // 'bcv-oficial' | 'bcv-today' | 'usdt.com.ve' | 'manual' | 'emergencia'
  disponible: boolean // false si fallo la fuente y no hay cache/BD
  esReferencial: boolean // true si es cache viejo, fin de semana, o fallback
  ultimaActualizacion: string // ISO timestamp
}

export interface SpreadInfo {
  absoluto: number // usdt.valor - bcv.valor (en Bs)
  porcentaje: number // (absoluto / bcv.valor) * 100
  nivel: NivelSpread
}

export interface TasasDuales {
  bcv: TasaIndividual
  usdt: TasaIndividual
  spread: SpreadInfo
  timestamp: number // Timestamp de cuando se calculo este objeto
}

// ==========================================
// ANALISIS DE MARGEN
// ==========================================

export type NivelAlertaMargen = 'ok' | 'atencion' | 'riesgo' | 'perdida'
// ok        >= 20%  margen real
// atencion  10-20%  margen real comprimido
// riesgo    0-10%   margen real minimo
// perdida   < 0%    se vende por debajo del costo real

export interface AnalisisMargen {
  // --- Inputs ---
  costoUSD: number
  precioVentaBs: number
  tasaBCV: number
  tasaUSDT: number

  // --- Conversiones intermedias ---
  costoEnBs_BCV: number
  costoEnBs_USDT: number
  precioEnUSD_BCV: number
  usdRealesRecibidos: number

  // --- Los 3 margenes ---
  margenNominal_pct: number
  margenReal_pct: number
  margenUSD_pct: number
  perdidaPorSpread_pct: number

  // --- Impacto monetario del spread ---
  perdidaPorSpread_bs: number
  perdidaPorSpread_usd: number

  // --- Semaforo (basado en margenReal_pct) ---
  alertaNivel: NivelAlertaMargen
  alertaMensaje: string
}

export interface PrecioSugeridoResult {
  costoUSD: number
  margenRealDeseado_pct: number
  precioMinimoBs: number
  precioSugeridoBs: number
  margenNominalResultante_pct: number
  verificacion: AnalisisMargen
}
