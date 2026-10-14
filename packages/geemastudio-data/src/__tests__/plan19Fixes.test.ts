import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { checkEmployeesAvailability } from '../agenda/availabilityCheck'
import { assignAppointmentEmployee } from '../agenda/operationsService'
import { guardOverlapForLines } from '../agenda/overlapGuard'
import { fetchCompletedServiceRefs } from '../dashboard/dashboardService'
import { updateInventoryItem } from '../inventory/inventoryService'

type Op = [string, ...unknown[]]
interface Call {
  table: string
  ops: Op[]
}

/** Cliente simulado: registra cada consulta y responde con `respond(call)`. */
function fakeClient(respond: (call: Call) => unknown) {
  const calls: Call[] = []
  const rpcs: [string, unknown][] = []
  const client = {
    from(table: string) {
      const call: Call = { table, ops: [] }
      calls.push(call)
      const q: Record<string, unknown> = {}
      for (const m of [
        'select',
        'update',
        'eq',
        'neq',
        'gte',
        'lte',
        'in',
        'is',
        'or',
        'order',
        'range',
      ]) {
        q[m] = (...args: unknown[]) => {
          call.ops.push([m, ...args])
          return q
        }
      }
      q.maybeSingle = () => {
        call.ops.push(['maybeSingle'])
        return Promise.resolve(respond(call))
      }
      q.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve(respond(call)).then(resolve, reject)
      return q
    },
    rpc(name: string, args: unknown) {
      rpcs.push([name, args])
      return Promise.resolve({ data: null, error: null })
    },
  } as unknown as SupabaseClient
  return { client, calls, rpcs }
}

const has = (call: Call, op: string) => call.ops.some((o) => o[0] === op)

describe('assignAppointmentEmployee', () => {
  it('pasa a la nueva persona las líneas vacías y las del profesional anterior', async () => {
    const { client, calls } = fakeClient((call) =>
      has(call, 'maybeSingle') ? { data: { employee_id: 'e1' }, error: null } : { error: null }
    )
    await assignAppointmentEmployee(client, 'a1', 'e2')
    const lines = calls.find((c) => c.table === 'appointment_services')!
    expect(lines.ops).toContainEqual(['update', { employee_id: 'e2' }])
    expect(lines.ops).toContainEqual(['or', 'employee_id.is.null,employee_id.eq.e1'])
  })

  it('sin profesional anterior solo llena las líneas vacías', async () => {
    const { client, calls } = fakeClient((call) =>
      has(call, 'maybeSingle') ? { data: { employee_id: null }, error: null } : { error: null }
    )
    await assignAppointmentEmployee(client, 'a1', 'e2')
    const lines = calls.find((c) => c.table === 'appointment_services')!
    expect(lines.ops).toContainEqual(['is', 'employee_id', null])
  })
})

describe('disponibilidad con varias personas', () => {
  const tz = 'America/Lima'
  // e2 no figura en el encabezado de la cita a1, pero atiende una de sus líneas.
  const respond = (call: Call) =>
    call.table === 'appointments'
      ? {
          data: [{ id: 'a1', date: '2026-10-14T10:00:00', duration: 60, employee_id: 'e1' }],
          error: null,
        }
      : { data: [{ appointment_id: 'a1', employee_id: 'e2' }], error: null }

  it('el aviso marca ocupado al segundo profesional', async () => {
    const { client } = fakeClient(respond)
    const overlap = await checkEmployeesAvailability(client, {
      employeeIds: ['e2'],
      start: new Date('2026-10-14T15:30:00Z'), // 10:30 en Lima
      durationMinutes: 30,
      timeZone: tz,
    })
    expect(overlap?.conflictingAppointmentId).toBe('a1')
  })

  it('el guardado lo bloquea con el mismo criterio', async () => {
    const { client } = fakeClient(respond)
    await expect(
      guardOverlapForLines(client, {
        employeeIds: ['e2'],
        dateIso: '2026-10-14T10:30:00',
        durationMinutes: 30,
        timeZone: tz,
      })
    ).rejects.toThrow('Horario ocupado')
  })

  it('una persona sin citas queda libre', async () => {
    const { client } = fakeClient(respond)
    const overlap = await checkEmployeesAvailability(client, {
      employeeIds: ['e3'],
      start: new Date('2026-10-14T15:30:00Z'),
      durationMinutes: 30,
      timeZone: tz,
    })
    expect(overlap).toBeNull()
  })
})

describe('fetchCompletedServiceRefs', () => {
  it('pagina hasta traer todo el histórico', async () => {
    const total = 2350
    const { client, calls } = fakeClient((call) => {
      const [, from, to] = call.ops.find((o) => o[0] === 'range') as [string, number, number]
      const size = Math.max(0, Math.min(to, total - 1) - from + 1)
      return {
        data: Array.from({ length: size }, () => ({ service_id: 's1', service_ids: null })),
        error: null,
      }
    })
    const refs = await fetchCompletedServiceRefs(client)
    expect(refs).toHaveLength(total)
    expect(calls).toHaveLength(3)
  })
})

describe('updateInventoryItem', () => {
  const input = {
    name: ' Gel ',
    category: 'unas',
    quantity: 7,
    min_stock: 2,
    unit: 'u',
    cost: null,
  }

  it('registra la diferencia de cantidad como movimiento', async () => {
    const { client, calls, rpcs } = fakeClient((call) =>
      has(call, 'maybeSingle') ? { data: { quantity: 10 }, error: null } : { error: null }
    )
    await updateInventoryItem(client, 't1', 'i1', input as never)
    const update = calls.find((c) => has(c, 'update'))!
    expect(update.ops.find((o) => o[0] === 'update')?.[1]).not.toHaveProperty('quantity')
    expect(rpcs).toEqual([['adjust_inventory_quantity', { p_item_id: 'i1', p_delta: -3 }]])
  })

  it('sin cambio de cantidad no crea movimiento', async () => {
    const { client, rpcs } = fakeClient((call) =>
      has(call, 'maybeSingle') ? { data: { quantity: 7 }, error: null } : { error: null }
    )
    await updateInventoryItem(client, 't1', 'i1', input as never)
    expect(rpcs).toHaveLength(0)
  })
})
