import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import {
  createPromoBroadcast,
  deletePromoBroadcast,
  fetchPromoSegment,
  normalizePromoBody,
  promoImagePath,
} from '../promos/promosService'

type Op = [string, ...unknown[]]
interface Call {
  table: string
  ops: Op[]
}

/** Cliente simulado: registra cada consulta y responde con `respond(call)`. */
function fakeClient(respond: (call: Call) => unknown) {
  const calls: Call[] = []
  const removed: string[][] = []
  const client = {
    from(table: string) {
      const call: Call = { table, ops: [] }
      calls.push(call)
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'insert', 'delete', 'eq', 'gte', 'in', 'not', 'or', 'order', 'limit']) {
        q[m] = (...args: unknown[]) => {
          call.ops.push([m, ...args])
          return q
        }
      }
      q.single = () => Promise.resolve(respond(call))
      q.maybeSingle = () => Promise.resolve(respond(call))
      q.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve(respond(call)).then(resolve, reject)
      return q
    },
    storage: {
      from: () => ({
        remove: (paths: string[]) => {
          removed.push(paths)
          return Promise.resolve({ error: null })
        },
      }),
    },
  } as unknown as SupabaseClient
  return { client, calls, removed }
}

const has = (call: Call, op: string, ...args: unknown[]) =>
  call.ops.some((o) => o[0] === op && args.every((a, i) => o[i + 1] === a))

const tz = 'America/Lima'

describe('fetchPromoSegment', () => {
  const clients = [
    { id: 'c1', name: 'Ana', phone: '51911111111', wa_user_id: null },
    { id: 'c2', name: 'Bea', phone: '51922222222', wa_user_id: null }, // bloqueada
    { id: 'c3', name: 'Cata', phone: '51933333333', wa_user_id: null }, // baja STOP
    { id: 'c4', name: 'Dani', phone: null, wa_user_id: 'PE.abc' }, // lead de anuncio
    { id: 'c5', name: 'Eli', phone: '51955555555', wa_user_id: null }, // cita futura
    { id: 'c6', name: 'Fer', phone: '51966666666', wa_user_id: null }, // vino hace poco
  ]
  const respond = (call: Call) => {
    if (call.table === 'waba_config') {
      const phones = has(call, 'eq', 'config_key', 'blocked_phone_numbers')
        ? ['922222222']
        : ['+51 933 333 333']
      return { data: { config_value: { phones } }, error: null }
    }
    if (call.table === 'whatsapp_sessions') return { data: [{ phone: 'PE.abc' }], error: null }
    if (call.table === 'clients') return { data: clients, error: null }
    if (call.table === 'appointments') {
      if (has(call, 'gte')) return { data: [{ client_id: 'c5' }], error: null }
      if (has(call, 'order')) {
        return {
          data: [
            { client_id: 'c1', date: '2020-01-01T10:00:00' },
            { client_id: 'c6', date: new Date().toISOString().slice(0, 19) },
          ],
          error: null,
        }
      }
      return { data: [{ client_id: 'c1' }], error: null }
    }
    return { data: [], error: null }
  }

  it('excluye bloqueadas y bajas, y filtra por tenant', async () => {
    const { client, calls } = fakeClient(respond)
    const rows = await fetchPromoSegment(client, {
      tenantId: 't1',
      timeZone: tz,
      categoryName: null,
      inactiveOnly: false,
    })
    expect(rows.map((r) => r.id)).toEqual(['c1', 'c4', 'c5', 'c6'])
    for (const t of ['clients', 'waba_config', 'whatsapp_sessions']) {
      expect(calls.filter((c) => c.table === t).every((c) => has(c, 'eq', 'tenant_id', 't1'))).toBe(true)
    }
  })

  it('solo inactivas: 30+ días sin cita futura, o leads de anuncio sin visitas', async () => {
    const { client } = fakeClient(respond)
    const rows = await fetchPromoSegment(client, {
      tenantId: 't1',
      timeZone: tz,
      categoryName: null,
      inactiveOnly: true,
    })
    expect(rows.map((r) => r.id)).toEqual(['c1', 'c4'])
    expect(rows.find((r) => r.id === 'c4')?.phone).toBe('PE.abc')
  })
})

describe('createPromoBroadcast', () => {
  const input = {
    tenantId: 't1',
    createdBy: 'u1',
    title: ' Halloween ',
    bodyText: 'Extensiones\n\na  S/50',
    imageUrl: 'https://x/promo-images/t1/a.jpg',
    recipients: [
      {
        id: 'c1',
        name: 'Ana',
        phone: '51911111111',
        last_appointment_date: null,
        days_since_last_visit: null,
        category_name: null,
      },
    ],
  }

  it('normaliza el texto y crea la campaña con sus destinatarias', async () => {
    const { client, calls } = fakeClient((call) =>
      call.table === 'promo_broadcasts' ? { data: { id: 'b1' }, error: null } : { error: null }
    )
    const b = await createPromoBroadcast(client, input)
    expect(b.id).toBe('b1')
    const insert = calls[0].ops.find((o) => o[0] === 'insert')?.[1] as Record<string, unknown>
    expect(insert).toMatchObject({ title: 'Halloween', body_text: 'Extensiones a S/50', status: 'draft' })
    const items = calls[1].ops.find((o) => o[0] === 'insert')?.[1] as Record<string, unknown>[]
    expect(items[0]).toMatchObject({ broadcast_id: 'b1', client_id: 'c1', tenant_id: 't1' })
  })

  it('si fallan las destinatarias borra la campaña', async () => {
    const { client, calls } = fakeClient((call) =>
      call.table === 'promo_broadcasts'
        ? { data: { id: 'b1' }, error: null }
        : has(call, 'insert')
          ? { error: { message: 'rls' } }
          : { error: null }
    )
    await expect(createPromoBroadcast(client, input)).rejects.toThrow('rls')
    expect(calls.some((c) => c.table === 'promo_broadcasts' && has(c, 'delete'))).toBe(true)
  })

  it('sin destinatarias no escribe nada', async () => {
    const { client, calls } = fakeClient(() => ({ error: null }))
    await expect(createPromoBroadcast(client, { ...input, recipients: [] })).rejects.toThrow(
      'Selecciona al menos una clienta'
    )
    expect(calls).toHaveLength(0)
  })
})

describe('deletePromoBroadcast', () => {
  it('borra imagen, destinatarias y campaña', async () => {
    const { client, calls, removed } = fakeClient(() => ({ error: null }))
    await deletePromoBroadcast(client, { id: 'b1', image_url: 'https://x/storage/v1/object/public/promo-images/t1/a.jpg' })
    expect(removed).toEqual([['t1/a.jpg']])
    expect(calls.map((c) => c.table)).toEqual(['promo_broadcast_items', 'promo_broadcasts'])
  })
})

describe('utilidades', () => {
  it('normalizePromoBody colapsa saltos y espacios', () => {
    expect(normalizePromoBody('  hola\n\nmundo  ')).toBe('hola mundo')
  })
  it('promoImagePath ignora URLs de otro bucket', () => {
    expect(promoImagePath('https://x/tenant-logos/a.png')).toBeNull()
  })
})
