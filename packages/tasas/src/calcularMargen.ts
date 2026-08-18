// Logica de calculo de margenes reales con doble tasa BCV+USDT.
// NO tiene efectos secundarios, NO hace fetch -- funciones puras.

import type { TasasDuales, AnalisisMargen, NivelAlertaMargen, PrecioSugeridoResult } from './types'

/**
 * Modelo: costo en USD duro, precio de venta en Bs (ya calculado a tasa BCV).
 * El vendedor convierte esos Bs al paralelo (USDT) -- de ahi el "margen real"
 * vs. el margen nominal en USD que aparenta el catalogo.
 */
export function calcularMargenReal(
  costoUSD: number,
  precioVentaBs: number,
  tasas: TasasDuales
): AnalisisMargen {
  if (costoUSD <= 0) throw new Error('costoUSD debe ser > 0')
  if (precioVentaBs <= 0) throw new Error('precioVentaBs debe ser > 0')

  const tasaBCV = tasas.bcv.valor
  const tasaUSDT = tasas.usdt.disponible ? tasas.usdt.valor : tasaBCV

  const costoEnBs_BCV = costoUSD * tasaBCV
  const costoEnBs_USDT = costoUSD * tasaUSDT

  const precioListaUSD = precioVentaBs / tasaBCV
  const usdRealesRecibidos = precioVentaBs / tasaUSDT

  const margenNominal_pct = ((precioListaUSD - costoUSD) / precioListaUSD) * 100
  const margenReal_pct = ((usdRealesRecibidos - costoUSD) / usdRealesRecibidos) * 100
  const perdidaPorSpread_pct = margenNominal_pct - margenReal_pct

  const perdidaPorSpread_usd = precioListaUSD - usdRealesRecibidos
  const perdidaPorSpread_bs = perdidaPorSpread_usd * tasaUSDT

  const alertaNivel = calcularNivelAlerta(margenReal_pct)
  const alertaMensaje = generarMensajeAlerta(alertaNivel, margenReal_pct, !tasas.usdt.disponible)

  return {
    costoUSD,
    precioVentaBs,
    tasaBCV,
    tasaUSDT,
    costoEnBs_BCV,
    costoEnBs_USDT,
    precioEnUSD_BCV: precioListaUSD,
    usdRealesRecibidos: redondear(usdRealesRecibidos),
    margenNominal_pct: redondear(margenNominal_pct),
    margenReal_pct: redondear(margenReal_pct),
    margenUSD_pct: redondear(perdidaPorSpread_pct),
    perdidaPorSpread_pct: redondear(perdidaPorSpread_pct),
    perdidaPorSpread_bs: redondear(perdidaPorSpread_bs),
    perdidaPorSpread_usd: redondear(perdidaPorSpread_usd),
    alertaNivel,
    alertaMensaje,
  }
}

/**
 * Calculadora inversa: dado un costo USD y el margen real deseado,
 * ¿a que precio en Bs se debe vender?
 *
 * precioVentaBs = costoUSD x tasaUSDT / (1 - margenDeseado/100)
 */
export function calcularPrecioSugerido(
  costoUSD: number,
  margenRealDeseado_pct: number,
  tasas: TasasDuales
): PrecioSugeridoResult {
  if (costoUSD <= 0) throw new Error('costoUSD debe ser > 0')
  if (margenRealDeseado_pct >= 100) throw new Error('El margen no puede ser >= 100%')

  const tasaUSDT = tasas.usdt.disponible ? tasas.usdt.valor : tasas.bcv.valor
  const costoEnBs_USDT = costoUSD * tasaUSDT

  const precioMinimoBs = redondear(costoEnBs_USDT)
  const precioSugeridoBs = redondear(costoEnBs_USDT / (1 - margenRealDeseado_pct / 100))

  const verificacion = calcularMargenReal(costoUSD, precioSugeridoBs, tasas)

  return {
    costoUSD,
    margenRealDeseado_pct,
    precioMinimoBs,
    precioSugeridoBs,
    margenNominalResultante_pct: verificacion.margenNominal_pct,
    verificacion,
  }
}

function calcularNivelAlerta(margenReal_pct: number): NivelAlertaMargen {
  if (margenReal_pct < 0) return 'perdida'
  if (margenReal_pct < 10) return 'riesgo'
  if (margenReal_pct < 20) return 'atencion'
  return 'ok'
}

function generarMensajeAlerta(
  nivel: NivelAlertaMargen,
  margenReal_pct: number,
  sinUSDT: boolean
): string {
  const aviso = sinUSDT ? ' (sin tasa USDT -- usando BCV como referencia)' : ''
  switch (nivel) {
    case 'perdida':
      return `Vendiendo a perdida real: ${margenReal_pct.toFixed(1)}%${aviso}`
    case 'riesgo':
      return `Margen real critico: ${margenReal_pct.toFixed(1)}% -- revisar precio${aviso}`
    case 'atencion':
      return `Margen real comprimido: ${margenReal_pct.toFixed(1)}%${aviso}`
    case 'ok':
      return `Margen real saludable: ${margenReal_pct.toFixed(1)}%${aviso}`
  }
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}
