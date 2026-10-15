import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { createAppointment } from '../agenda/agendaService'
import type { AgendaService } from '../agenda/types'

/** Cliente simulado: toda consulta devuelve vacío; la RPC responde con `rpcResult`. */
function fakeClient(rpcResult: { data: unknown; error: unknown }) {
  const tables: string[] = []
  const rpcs: [string, Record<string, unknown>][] = []
  const client = {
    from(table: string) {
      tables.push(table)
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'neq', 'gte', 'lte', 'lt', 'gt', 'in', 'is', 'or', 'order', 'limit']) {
        q[m] = () => q
      }
      q.maybeSingle = () => Promise.resolve({ data: null, error: null })
      q.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
      return q
    },
    rpc(name: string, args: Record<string, unknown>) {
      rpcs.push([name, args])
      return Promise.resolve(rpcResult)
    },
  } as unknown as SupabaseClient
  return { client, tables, rpcs }
}

const services: AgendaService[] = [
  { id: 's1', name: 'Lifting', price: 80, duration: 60 },
  { id: 's2', name: 'Cejas', price: '40', duration: 30 },
]

const input = {
  client_name: 'Ana Pérez',
  date: '2026-10-20T10:00:00',
  lines: [
    { serviceId: 's1', employeeId: 'e1' },
    { serviceId: 's2', employeeId: '' },
  ],
  tenantId: 'zm-lash-nails',
  timeZone: 'America/Lima',
}

describe('createAppointment', () => {
  it('crea la cita y sus líneas en una sola RPC', async () => {
    const { client, tables, rpcs } = fakeClient({ data: 'apt-1', error: null })
    const id = await createAppointment(client, input, services)

    expect(id).toBe('apt-1')
    expect(tables).not.toContain('appointment_services')
    expect(rpcs).toHaveLength(1)
    const [name, args] = rpcs[0]
    expect(name).toBe('create_appointment_with_services')
    expect(args.p_appointment).toMatchObject({
      tenant_id: 'zm-lash-nails',
      service_id: 's1',
      employee_id: 'e1',
      service_ids: ['s1', 's2'],
      duration: 90,
      price: '120.00',
      status: 'scheduled',
    })
    expect(args.p_services).toEqual([
      { service_id: 's1', employee_id: 'e1', pack_id: null, price: '80.00', duration: 60 },
      { service_id: 's2', employee_id: null, pack_id: null, price: '40.00', duration: 30 },
    ])
  })

  it('propaga el error de la RPC sin borrados manuales', async () => {
    const { client, tables } = fakeClient({ data: null, error: { message: 'violates row-level security' } })
    await expect(createAppointment(client, input, services)).rejects.toThrow('row-level security')
    expect(tables).not.toContain('appointment_services')
  })

  it('sin servicios no llama a la base', async () => {
    const { client, rpcs } = fakeClient({ data: 'x', error: null })
    await expect(createAppointment(client, { ...input, lines: [] }, services)).rejects.toThrow(
      'Selecciona al menos un servicio'
    )
    expect(rpcs).toHaveLength(0)
  })
})
