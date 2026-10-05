import { describe, expect, it } from 'vitest'
import { resolverTasasDuales, type ClienteLecturaTasas } from './clienteTasasDuales'

function clienteFalso(
  filas: Record<string, { fecha: string; usd: number; fuente?: string } | null>
) {
  const consultadas: string[] = []
  const cliente: ClienteLecturaTasas = {
    from: (tabla) => {
      consultadas.push(tabla)
      const q: any = {
        eq: () => q,
        lte: () => q,
        gt: () => q,
        neq: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data: filas[tabla] ?? null, error: null }),
      }
      return { select: () => q }
    },
  }
  return { cliente, consultadas }
}

describe('resolverTasasDuales', () => {
  it('devuelve null sin tasa BCV', async () => {
    const { cliente } = clienteFalso({})
    expect(await resolverTasasDuales(cliente, { bcv: 'b', usdt: 'u' })).toBeNull()
  })

  it('usa las tablas inyectadas y calcula spread', async () => {
    const { cliente, consultadas } = clienteFalso({
      b: { fecha: '2026-10-02', usd: 100, fuente: 'bcv-today' },
      u: { fecha: '2026-10-02', usd: 130 },
    })
    const r = await resolverTasasDuales(cliente, { bcv: 'b', usdt: 'u' })
    expect(consultadas).toEqual(['b', 'u'])
    expect(r?.bcv.valor).toBe(100)
    expect(r?.usdt.disponible).toBe(true)
    expect(r?.spread.porcentaje).toBeCloseTo(30)
    expect(r?.spread.nivel).toBe('alto')
  })

  it('marca USDT no disponible y cae al valor BCV', async () => {
    const { cliente } = clienteFalso({ b: { fecha: '2026-10-02', usd: 100 } })
    const r = await resolverTasasDuales(cliente, { bcv: 'b', usdt: 'u' })
    expect(r?.usdt.disponible).toBe(false)
    expect(r?.usdt.valor).toBe(100)
  })
})
