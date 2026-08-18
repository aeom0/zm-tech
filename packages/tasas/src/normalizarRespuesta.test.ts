import { describe, expect, it } from 'vitest'
import { normalizarRespuestaTasaApi } from './normalizarRespuesta'

describe('normalizarRespuestaTasaApi', () => {
  it('lee la respuesta real del endpoint con campos en la raíz', () => {
    const resultado = normalizarRespuestaTasaApi(
      {
        bcv: {
          valor: 145.25,
          fecha: '2026-08-18',
          fuente: 'bcv-today',
          disponible: true,
          esReferencial: false,
          ultimaActualizacion: '2026-08-18T12:00:00.000Z',
        },
        usdt: {
          valor: 180.5,
          fecha: '2026-08-18',
          fuente: 'usdt.com.ve',
          disponible: true,
        },
        spread: { absoluto: 35.25, porcentaje: 24.27, nivel: 'alto' },
        timestamp: 123,
      },
      '2026-08-18T12:00:00.000Z'
    )

    expect(resultado.bcv.valor).toBe(145.25)
    expect(resultado.bcv.disponible).toBe(true)
    expect(resultado.usdt.valor).toBe(180.5)
    expect(resultado.usdt.disponible).toBe(true)
    expect(resultado.spread.nivel).toBe('alto')
    expect(resultado.timestamp).toBe(123)
  })

  it('usa BCV como fallback cuando USDT no está disponible', () => {
    const resultado = normalizarRespuestaTasaApi(
      {
        bcv: { valor: 145.25, disponible: true },
        usdt: { disponible: false },
      },
      '2026-08-18T12:00:00.000Z'
    )

    expect(resultado.usdt.valor).toBe(145.25)
    expect(resultado.usdt.fuente).toBe('fallback-bcv')
    expect(resultado.usdt.esReferencial).toBe(true)
  })
})
