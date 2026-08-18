// Calculo puro del spread BCV vs USDT. Client-safe.

import type { NivelSpread, SpreadInfo } from './types'

export function calcularSpreadInfo(tasaBCV: number, tasaUSDT: number): SpreadInfo {
  const absoluto = tasaUSDT - tasaBCV
  const porcentaje = tasaBCV > 0 ? (absoluto / tasaBCV) * 100 : 0
  return {
    absoluto: Math.round(absoluto * 100) / 100,
    porcentaje: Math.round(porcentaje * 100) / 100,
    nivel: nivelDeSpread(porcentaje),
  }
}

function nivelDeSpread(porcentaje: number): NivelSpread {
  if (porcentaje < 10) return 'bajo'
  if (porcentaje < 20) return 'medio'
  if (porcentaje < 35) return 'alto'
  return 'critico'
}
