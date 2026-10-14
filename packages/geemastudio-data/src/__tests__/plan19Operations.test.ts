import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { referenceStoragePath, resolveReferenceImageUrls } from '../agenda/referenceImagesService'
import { computeTopServices, fetchDashboardStats } from '../dashboard/dashboardService'
import { buildPaymentRows, parseMoneyInput, type PaymentDraft } from '../finances/paymentDraft'
import {
  isLowStock,
  mergeInventoryCategories,
  slugifyCategoryKey,
} from '../inventory/inventoryCategories'
import { rowToVerificationItem } from '../verifications/verificationsService'

describe('inventario', () => {
  it('genera keys estables sin acentos ni espacios', () => {
    expect(slugifyCategoryKey('  Pestañas y Cejas! ')).toBe('pestanas_y_cejas')
    expect(slugifyCategoryKey('Cuidado Capilar')).toBe('cuidado_capilar')
  })

  it('suma categorías propias sin duplicar las del rubro', () => {
    const merged = mergeInventoryCategories('barbershop', [
      { id: 'c1', key: 'insumos', label: 'Insumos repetidos' },
      { id: 'c2', key: 'ceras', label: 'Ceras' },
    ] as never)
    expect(merged.map((c) => c.key)).toEqual(['cabello', 'barba', 'insumos', 'ceras'])
    expect(merged.at(-1)).toMatchObject({ isCustom: true, id: 'c2' })
  })

  it('usa spa-nails si el rubro no existe', () => {
    expect(mergeInventoryCategories('otro', [])[0].key).toBe('unas')
  })

  it('marca stock bajo al llegar al mínimo', () => {
    expect(isLowStock({ quantity: 2, min_stock: 2 })).toBe(true)
    expect(isLowStock({ quantity: 3, min_stock: 2 })).toBe(false)
  })
})

describe('validación de pagos', () => {
  const base = {
    id: 'v1',
    client_name: 'Ana',
    service_name: 'Lifting',
    appointment_date: '2026-10-14T10:00:00',
    amount_deposit: '15',
    amount_total: '60',
    kind: null,
    approved_at: null,
    rejected_at: null,
    deposit_forfeit_risk: null,
  }

  it('usa el adelanto en comprobantes de reserva', () => {
    const item = rowToVerificationItem(base, 'pending')
    expect(item.price).toBe(15)
    expect(item.canMarkForfeit).toBe(true)
    expect(item.depositForfeited).toBe(false)
  })

  it('usa el total en pagos post-servicio y no permite retener', () => {
    const item = rowToVerificationItem({ ...base, kind: 'post_service_payment' }, 'approved')
    expect(item.price).toBe(60)
    expect(item.canMarkForfeit).toBe(false)
  })

  it('no permite retener adelantos rechazados', () => {
    expect(rowToVerificationItem(base, 'rejected').canMarkForfeit).toBe(false)
  })
})

describe('buildPaymentRows', () => {
  const draft: PaymentDraft = {
    tenantId: 't1',
    appointmentId: 'a1',
    type: 'full',
    amount: '50',
    currency: 'USD',
    vesEnabled: false,
    rate: null,
    method: 'cash',
    notes: '  ',
    date: '2026-10-14',
  }

  it('acepta coma decimal', () => {
    expect(parseMoneyInput('12,5')).toBe(12.5)
  })

  it('rechaza montos vacíos o negativos', () => {
    expect(buildPaymentRows({ ...draft, amount: '' }).ok).toBe(false)
    expect(buildPaymentRows({ ...draft, amount: '-3' }).ok).toBe(false)
  })

  it('arma una fila de servicio sin notas vacías', () => {
    const res = buildPaymentRows(draft)
    expect(res.ok && res.rows).toEqual([
      expect.objectContaining({ amount: '50', kind: 'service', is_abono: false, notes: null }),
    ])
  })

  it('reparte el pago completo entre servicio y productos', () => {
    const res = buildPaymentRows({ ...draft, productAmount: '20' })
    expect(res.ok && res.rows.map((r) => [r.kind, r.amount])).toEqual([
      ['service', '30'],
      ['product', '20'],
    ])
  })

  it('exige que el adelanto sea menor que el total del servicio', () => {
    expect(buildPaymentRows({ ...draft, type: 'abono', serviceTotal: '40' }).ok).toBe(false)
    const res = buildPaymentRows({ ...draft, type: 'abono', amount: '10', serviceTotal: '40' })
    expect(res.ok && res.rows[0]).toMatchObject({
      kind: 'deposit',
      is_abono: true,
      service_total: 40,
    })
  })

  it('convierte bolívares a la moneda del negocio con la tasa', () => {
    const res = buildPaymentRows({
      ...draft,
      vesEnabled: true,
      currency: 'VES',
      rate: 40,
      amount: '400',
    })
    expect(res.ok && res.rows[0]).toMatchObject({
      amount: '10',
      paid_currency: 'VES',
      amount_ves: 400,
      exchange_rate: 40,
    })
    expect(buildPaymentRows({ ...draft, vesEnabled: true, currency: 'VES' }).ok).toBe(false)
  })
})

describe('fotos de referencia', () => {
  it('extrae la ruta del bucket de URLs públicas viejas', () => {
    expect(referenceStoragePath('/t1/a1/foto.jpg')).toBe('t1/a1/foto.jpg')
    expect(
      referenceStoragePath(
        'https://x.supabase.co/storage/v1/object/public/service-references/t1/a%201.jpg?v=2'
      )
    ).toBe('t1/a 1.jpg')
    expect(referenceStoragePath('https://instagram.com/p/abc')).toBeNull()
  })

  it('firma las rutas, deja los links externos y descarta las fallidas', async () => {
    const client = {
      storage: {
        from: () => ({
          createSignedUrls: async (paths: string[]) => ({
            data: paths
              .filter((p) => p !== 't1/rota.jpg')
              .map((p) => ({ path: p, signedUrl: `signed:${p}` })),
            error: null,
          }),
        }),
      },
    } as unknown as SupabaseClient
    const urls = await resolveReferenceImageUrls(client, [
      't1/a.jpg',
      'https://instagram.com/p/abc',
      't1/rota.jpg',
    ])
    expect(urls).toEqual(['signed:t1/a.jpg', 'https://instagram.com/p/abc'])
  })
})

describe('dashboard', () => {
  it('cuenta cada servicio de las citas multi-servicio y ordena por uso', () => {
    const names: Record<string, string> = { s1: 'Lifting', s2: 'Cejas', s3: 'Uñas' }
    const top = computeTopServices(
      [
        { service_id: 's1', service_ids: null },
        { service_id: 's1', service_ids: ['s2', 's3'] },
        { service_id: null, service_ids: ['s3'] },
        { service_id: 's9', service_ids: [] },
      ],
      (id) => names[id],
      3
    )
    expect(top).toEqual([
      { id: 's3', count: 2, name: 'Uñas' },
      { id: 's2', count: 1, name: 'Cejas' },
      { id: 's1', count: 1, name: 'Lifting' },
    ])
  })

  it('suma ingresos y cuenta stock bajo', async () => {
    const results: Record<string, unknown> = {
      payments: { data: [{ amount: '10.5' }, { amount: 4 }], error: null },
      inventory_items: {
        data: [
          { quantity: 1, min_stock: 2 },
          { quantity: 5, min_stock: 2 },
        ],
        error: null,
      },
    }
    let aptCall = 0
    const chain = (result: unknown) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'gte', 'lt', 'lte']) q[m] = () => q
      q.then = (resolve: (v: unknown) => void) => resolve(result)
      return q
    }
    const client = {
      from: (table: string) =>
        chain(
          table === 'appointments'
            ? { count: ++aptCall === 1 ? 3 : 7, error: null }
            : results[table]
        ),
    } as unknown as SupabaseClient

    const stats = await fetchDashboardStats(client, {
      paymentFrom: 'a',
      paymentTo: 'b',
      appointmentFrom: 'c',
      appointmentTo: 'd',
    })
    expect(stats).toEqual({
      todayRevenue: 14.5,
      completedAppointments: 3,
      upcomingAppointments: 7,
      lowStockItems: 1,
    })
  })
})
