import { describe, expect, it } from 'vitest'
import {
  computeServiceLinesTotals,
  lineDuration,
  lineUnitPrice,
  splitPackTotalEqually,
} from '../agenda/agendaUtils'
import { checkDocument, checkEmail, checkPhone, cleanDocument } from '../clients/clientFields'
import {
  normalizePersonName,
  normalizePhoneInput,
  splitCountryAndNumber,
} from '../clients/clientLink'

describe('clientLink & clientFields', () => {
  it('normaliza nombres en mayúsculas y quita espacios extra', () => {
    expect(normalizePersonName('  maría   josé  perez  ')).toBe('MARÍA JOSÉ PEREZ')
  })

  it('normaliza teléfonos y parte país', () => {
    expect(normalizePhoneInput('+51 987-654-321')).toBe('+51987654321')
    const splitPe = splitCountryAndNumber('+51987654321')
    expect(splitPe).toEqual({ country: 'PE', normalized: '987654321' })

    const splitVe = splitCountryAndNumber('+584141234567')
    expect(splitVe).toEqual({ country: '58', normalized: '4141234567' })
  })

  it('valida teléfono nacional PE y VE', () => {
    const validPe = checkPhone('987654321', 'PE')
    expect(validPe.phone).toBe('51987654321')
    expect(validPe.error).toBeUndefined()

    const validVe = checkPhone('04141234567', 'VE')
    expect(validVe.phone).toBe('584141234567')
    expect(validVe.error).toBeUndefined()
  })

  it('valida cédulas / DNI según país', () => {
    expect(cleanDocument(' 12.345.678 ')).toBe('12345678')
    const dniPe = checkDocument('12345678', 'PE')
    expect(dniPe.value).toBe('12345678')
    expect(dniPe.hint).toBe('DNI')

    const ciVe = checkDocument('V12345678', 'VE')
    expect(ciVe.value).toBe('V12345678')
    expect(ciVe.error).toBeUndefined()
  })

  it('valida correos', () => {
    expect(checkEmail('cliente@example.com').error).toBeUndefined()
    expect(checkEmail('invalido@com').error).toBeDefined()
    expect(checkEmail('').error).toBeUndefined()
  })
})

describe('agendaUtils', () => {
  it('reparte el total de un pack equitativamente al centavo', () => {
    const shares = splitPackTotalEqually(100, 3)
    expect(shares).toEqual([33.34, 33.33, 33.33])
    const sum = shares.reduce((a, b) => a + b, 0)
    expect(Number(sum.toFixed(2))).toBe(100)
  })

  it('calcula totales de líneas multi-servicio', () => {
    const services = [
      { id: 's1', name: 'Lifting', price: 30, duration: 45 },
      { id: 's2', name: 'Cejas', price: 20, duration: 30 },
    ]
    const lines = [
      { serviceId: 's1', employeeId: 'e1' },
      { serviceId: 's2', employeeId: 'e1', priceOverride: 15 },
    ]

    expect(lineUnitPrice(lines[0], services)).toBe(30)
    expect(lineUnitPrice(lines[1], services)).toBe(15)
    expect(lineDuration(lines[0], services)).toBe(45)

    const totals = computeServiceLinesTotals(lines, services)
    expect(totals.totalPrice).toBe(45)
    expect(totals.totalDuration).toBe(75)
  })
})
