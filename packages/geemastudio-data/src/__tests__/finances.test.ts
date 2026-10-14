import { describe, expect, it } from 'vitest'

import {
  amountDueForAppointment,
  evaluateCompletionGate,
  paymentMethodIcon,
  paymentMethodLabel,
  paymentMethodsForCountry,
  vesFieldsForQuickMethod,
} from '../finances'

const apt = { id: 'a1', price: '100' }
const pay = (amount: number | string, appointment_id: string | null = 'a1') => ({
  appointment_id,
  amount,
  is_abono: false,
})

describe('evaluateCompletionGate', () => {
  it('sin pagos pide cobrar el precio completo', () => {
    expect(evaluateCompletionGate(apt, [])).toEqual({
      kind: 'needs_payment',
      totalPaid: 0,
      amountDue: 100,
    })
  })

  it('abono parcial bloquea con el saldo pendiente', () => {
    expect(evaluateCompletionGate(apt, [pay('30'), pay(20.5)])).toEqual({
      kind: 'partial',
      totalPaid: 50.5,
      amountDue: 49.5,
    })
  })

  it('pagada por completo (o de más) se completa', () => {
    expect(evaluateCompletionGate(apt, [pay(60), pay(40)]).kind).toBe('paid')
    expect(evaluateCompletionGate(apt, [pay(120)]).kind).toBe('paid')
  })

  it('ignora pagos de otras citas', () => {
    expect(evaluateCompletionGate(apt, [pay(100, 'otra')]).kind).toBe('needs_payment')
  })

  it('cita sin precio se completa sin cobro', () => {
    expect(evaluateCompletionGate({ id: 'a1', price: 0 }, []).kind).toBe('paid')
  })

  it('saldo pendiente nunca es negativo', () => {
    expect(amountDueForAppointment(apt, [pay(150)])).toBe(0)
  })
})

describe('paymentMethods', () => {
  it('filtra por país', () => {
    expect(paymentMethodsForCountry('PE').map((m) => m.id)).toEqual([
      'cash',
      'card',
      'yape',
      'plin',
      'transfer',
    ])
    expect(paymentMethodsForCountry('VE').map((m) => m.id)).toEqual([
      'cash',
      'card',
      'pago_movil',
      'zelle',
      'transfer',
    ])
  })

  it('etiqueta e ícono incluyen el método retail yape_plin', () => {
    expect(paymentMethodLabel('yape_plin')).toBe('Yape/Plin')
    expect(paymentMethodIcon('yape_plin')).toBe('smartphone')
    expect(paymentMethodLabel('desconocido')).toBe('desconocido')
  })
})

describe('vesFieldsForQuickMethod', () => {
  it('Pago Móvil con tasa se registra en Bs', () => {
    const fields = vesFieldsForQuickMethod('pago_movil', 10, 40)
    expect(fields.paid_currency).toBe('VES')
    expect(fields.exchange_rate).toBe(40)
    expect(fields.amount_ves).toBeCloseTo(400)
  })

  it('otros métodos o sin tasa no llevan moneda', () => {
    expect(vesFieldsForQuickMethod('cash', 10, 40)).toEqual({})
    expect(vesFieldsForQuickMethod('pago_movil', 10, null)).toEqual({})
  })
})
