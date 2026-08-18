// @zmtech/tasas -- entrypoint client-safe.
// Sin fetch, sin Node built-ins: seguro para Next.js (browser) y React Native.
// El scraping/persistencia server-only vive en '@zmtech/tasas/server'.

export type {
  NivelSpread,
  TasaIndividual,
  SpreadInfo,
  TasasDuales,
  NivelAlertaMargen,
  AnalisisMargen,
  PrecioSugeridoResult,
} from './types'

export { normalizarRespuestaTasaApi } from './normalizarRespuesta'
export type { RespuestaTasaApi } from './normalizarRespuesta'

export { convertirUsdABs, convertirBsAUsd, validarDetallesPagoMixto } from './pagos'
export type {
  MonedaPago,
  MetodoPago,
  DetallePago,
  DetallesPago,
  ValidacionPagoMixto,
} from './pagos'

export { calcularMargenReal, calcularPrecioSugerido } from './calcularMargen'

export { calcularSpreadInfo } from './spread'

export {
  FERIADOS_BANCARIOS_VE,
  esFeriadoBancario,
  obtenerFechaReferenciaBCV,
  esFinDeSemana,
  obtenerViernesAnterior,
  ahoraVenezuela,
  formatearFechaDisplay,
} from './logicaBCV'

// Hook WEB-only (usa localStorage) -- no importar desde React Native.
export { useTasasDuales } from './hooks/useTasasDuales'
