import { describe, expect, it } from 'vitest'
import {
  HAIKU_4_5_RATE,
  HAIKU_5_5_RATE,
  aiUsageRowCostUsd,
  haikuRateFor,
  summarizeAiUsageCost,
  type AiUsageRow,
} from '../finances/aiUsageCost'

function row(over: Partial<AiUsageRow>): AiUsageRow {
  return {
    created_at: '2026-10-10T12:00:00Z',
    trigger_type: 'fallback',
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    ...over,
  }
}

describe('aiUsageCost', () => {
  it('el agente siempre usa la tarifa de Haiku 5.5', () => {
    expect(haikuRateFor(row({ trigger_type: 'agent' }))).toBe(HAIKU_5_5_RATE)
  })

  it('el resto usa 4.5 antes del 15-oct 01:57 UTC y 5.5 después', () => {
    expect(haikuRateFor(row({ created_at: '2026-10-15T01:56:00Z' }))).toBe(HAIKU_4_5_RATE)
    expect(haikuRateFor(row({ created_at: '2026-10-15T01:57:00Z' }))).toBe(HAIKU_5_5_RATE)
  })

  it('suma entrada, salida y caché (escritura 1.25×, lectura 0.1×)', () => {
    const cost = aiUsageRowCostUsd(
      row({
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 1_000_000,
        cache_read_input_tokens: 1_000_000,
      })
    )
    expect(cost).toBeCloseTo(1 + 5 + 1.25 + 0.1, 6)
  })

  it('resume llamadas y costo; tokens nulos cuentan como 0', () => {
    const summary = summarizeAiUsageCost([
      row({ trigger_type: 'agent', output_tokens: 2_000_000 }),
      row({ input_tokens: null, output_tokens: null }),
    ])
    expect(summary.calls).toBe(2)
    expect(summary.costUsd).toBeCloseTo(1, 6)
  })
})
