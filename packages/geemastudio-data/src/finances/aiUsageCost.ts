import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Costo del asistente (Haiku) a partir de ai_usage_log.
 * La tabla no guarda el modelo: sale de la fecha y del trigger.
 * - El agente (`trigger_type = 'agent'`) usa Haiku 5.5 desde su alta (8-oct-2026).
 * - El resto pasó de Haiku 4.5 a 5.5 el 15-oct-2026 01:57 UTC (commit eb70fada).
 * Tarifas USD por millón de tokens; caché: escritura 1.25×, lectura 0.1× la entrada.
 */
export interface HaikuRate {
  inputPerMTok: number
  outputPerMTok: number
}

export const HAIKU_4_5_RATE: HaikuRate = { inputPerMTok: 1, outputPerMTok: 5 }
export const HAIKU_5_5_RATE: HaikuRate = { inputPerMTok: 0.1, outputPerMTok: 0.5 }

const ALL_TRIGGERS_ON_5_5_AT = Date.parse('2026-10-15T01:57:00Z')
const CACHE_WRITE_MULTIPLIER = 1.25
const CACHE_READ_MULTIPLIER = 0.1

export interface AiUsageRow {
  created_at: string
  trigger_type: string | null
  input_tokens: number | null
  output_tokens: number | null
  cache_creation_input_tokens: number | null
  cache_read_input_tokens: number | null
}

export function haikuRateFor(row: Pick<AiUsageRow, 'created_at' | 'trigger_type'>): HaikuRate {
  if (row.trigger_type === 'agent') return HAIKU_5_5_RATE
  const at = Date.parse(row.created_at)
  return Number.isFinite(at) && at >= ALL_TRIGGERS_ON_5_5_AT ? HAIKU_5_5_RATE : HAIKU_4_5_RATE
}

export function aiUsageRowCostUsd(row: AiUsageRow): number {
  const rate = haikuRateFor(row)
  const input =
    (row.input_tokens ?? 0) +
    CACHE_WRITE_MULTIPLIER * (row.cache_creation_input_tokens ?? 0) +
    CACHE_READ_MULTIPLIER * (row.cache_read_input_tokens ?? 0)
  return (input * rate.inputPerMTok + (row.output_tokens ?? 0) * rate.outputPerMTok) / 1_000_000
}

export interface AiUsageCostSummary {
  calls: number
  costUsd: number
}

export function summarizeAiUsageCost(rows: AiUsageRow[]): AiUsageCostSummary {
  let costUsd = 0
  for (const row of rows) costUsd += aiUsageRowCostUsd(row)
  return { calls: rows.length, costUsd }
}

const AI_USAGE_COLUMNS =
  'created_at, trigger_type, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens'
const PAGE_SIZE = 1000

/** Filas de ai_usage_log en [fromIso, toIso), paginadas (PostgREST corta en 1000). */
export async function fetchAiUsageRows(
  client: SupabaseClient,
  fromIso: string,
  toIso: string
): Promise<AiUsageRow[]> {
  const rows: AiUsageRow[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from('ai_usage_log')
      .select(AI_USAGE_COLUMNS)
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`ai_usage_log: ${error.message}`)
    const page = (data ?? []) as AiUsageRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}
