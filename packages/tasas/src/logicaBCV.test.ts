import { afterEach, describe, expect, it, vi } from 'vitest'
import { ahoraVenezuela, obtenerFechaReferenciaBCV } from './logicaBCV'

describe('logicaBCV', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('calcula la hora civil venezolana sin depender de la zona local', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T03:30:00.000Z'))

    expect(ahoraVenezuela().format('YYYY-MM-DD HH:mm')).toBe('2026-08-18 23:30')
  })

  it('mantiene el viernes como referencia durante el sábado', () => {
    expect(obtenerFechaReferenciaBCV('2026-08-22')).toBe('2026-08-21')
  })

  it('retrocede al día hábil anterior en feriado', () => {
    expect(obtenerFechaReferenciaBCV('2026-06-08')).toBe('2026-06-05')
  })
})
