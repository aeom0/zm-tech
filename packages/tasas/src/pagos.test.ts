import { describe, expect, it } from 'vitest'
import { convertirBsAUsd, convertirUsdABs, validarDetallesPagoMixto } from './pagos'

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
