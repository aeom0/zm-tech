import { describe, expect, it } from 'vitest'
import { convertirBsAUsd, convertirUsdABs, formatearBs, validarDetallesPagoMixto } from './pagos'

describe('pagos BCV', () => {
  it('convierte USD a Bs y redondea a dos decimales', () => {
    expect(convertirUsdABs(10, 773.3125)).toBe(7733.13)
    expect(convertirBsAUsd(7733.13, 773.3125)).toBe(10)
  })

  it('valida un pago mixto con USD y Bs', () => {
    const resultado = validarDetallesPagoMixto(
      {
        CASH_USD: { monto: 10, moneda: 'USD' },
        CASH_BS: { monto: 7733.13, moneda: 'BS' },
      },
      20,
      773.3125
    )

    expect(resultado.valido).toBe(true)
    expect(resultado.totalUsdConvertido).toBe(20)
    expect(resultado.diferenciaUsd).toBe(0)
  })

  it('rechaza un desglose que no cubre el total', () => {
    const resultado = validarDetallesPagoMixto(
      { CASH_BS: { monto: 7000, moneda: 'BS' } },
      10,
      773.3125
    )

    expect(resultado.valido).toBe(false)
    expect(resultado.diferenciaUsd).toBe(-0.95)
    expect(resultado.mensaje).toContain('$9.05')
  })

  it('rechaza tasas inválidas', () => {
    expect(() => convertirUsdABs(10, 0)).toThrow('mayor que cero')
  })
})

describe('formatearBs', () => {
  it('usa punto de miles y coma decimal', () => {
    expect(formatearBs(1234567.891)).toBe('Bs. 1.234.567,89')
    expect(formatearBs(0.5)).toBe('Bs. 0,50')
    expect(formatearBs(-1500)).toBe('-Bs. 1.500,00')
    expect(formatearBs(Number.NaN)).toBe('Bs. 0,00')
  })
})
