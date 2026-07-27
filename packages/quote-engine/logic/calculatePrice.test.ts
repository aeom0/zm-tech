import { describe, expect, it } from 'vitest'
import { calculatePrice } from './calculatePrice'

describe('calculatePrice', () => {
  it('sin bundle: suma precios fijos de los servicios', () => {
    const result = calculatePrice({
      serviceIds: ['landing-1pagina', 'seo-onpage', 'whatsapp-boton'],
    })

    expect(result.bundleAplicado).toBeNull()
    expect(result.requiereContactoDirecto).toBe(false)
    expect(result.subtotal).toBe(150 + 40 + 40)
    expect(result.descuento).toBe(0)
    expect(result.total).toBe(230)
    expect(result.lineItems).toHaveLength(3)
  })

  it('con bundle: aplica descuento cuando serviceIds contienen el combo completo', () => {
    // combo-landing-completo: sitio + form + seo + whatsapp, descuento $10 monto
    const result = calculatePrice({
      serviceIds: [
        'sitio-multiseccion',
        'form-envio-auto',
        'seo-onpage',
        'whatsapp-boton',
        'dominio-1er-ano', // superset — no rompe el match
      ],
    })

    expect(result.bundleAplicado?.id).toBe('combo-landing-completo')
    expect(result.requiereContactoDirecto).toBe(false)
    expect(result.subtotal).toBe(300 + 30 + 40 + 40 + 0)
    expect(result.descuento).toBe(10)
    expect(result.total).toBe(400)
  })

  it('con servicio precioVisible: false → requiereContactoDirecto y total en 0', () => {
    const result = calculatePrice({
      serviceIds: ['suite-completa', 'landing-1pagina'],
    })

    expect(result.requiereContactoDirecto).toBe(true)
    expect(result.bundleAplicado).toBeNull()
    expect(result.subtotal).toBe(0)
    expect(result.descuento).toBe(0)
    expect(result.total).toBe(0)
    expect(result.lineItems.some((li) => li.service.id === 'suite-completa')).toBe(true)
  })

  it('PriceRange usa min para el subtotal', () => {
    const result = calculatePrice({
      serviceIds: ['migracion-datos'],
    })

    expect(result.subtotal).toBe(60)
    expect(result.total).toBe(60)
    expect(result.lineItems[0]?.precioMostrado).toEqual({ min: 60, max: 150 })
  })
})
