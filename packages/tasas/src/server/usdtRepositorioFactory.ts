/** Cliente Supabase minimo (mismo shape que ClienteTasasBcv). */
export type ClienteTasasUsdt = {
  from: (tabla: string) => {
    select: (columnas: string) => QueryTasasUsdt
    upsert: (
      row: Record<string, unknown>,
      opts: { onConflict: string }
    ) => PromiseLike<{ error: unknown }>
  }
}

type QueryTasasUsdt = {
  eq: (col: string, val: string) => QueryTasasUsdt
  lte: (col: string, val: string) => QueryTasasUsdt
  order: (col: string, opts: { ascending: boolean }) => QueryTasasUsdt
  limit: (n: number) => QueryTasasUsdt
  maybeSingle: () => PromiseLike<{ data: FilaTasasUsdt | null; error: unknown }>
}

export interface FilaTasasUsdt {
  fecha: string
  usd: number
  fuente?: string | null
}

export interface RepositorioTasasUsdt {
  /** Ultima fila del mercado 'binance' con fecha <= fechaMax. */
  obtenerUltimaHasta(fechaMax: string): Promise<FilaTasasUsdt | null>
  guardar(fila: {
    fecha: string
    usd: number
    buy_rate?: number | null
    sell_rate?: number | null
    fuente: string
    notas?: string
  }): Promise<void>
}

/** Tabla compartida cross-producto: hub_tasas_usdt (ver docs/hub/supabase/migrations/). */
const TABLA = 'hub_tasas_usdt'
const MERCADO = 'binance'

export function crearRepositorioTasasUsdt(cliente: ClienteTasasUsdt): RepositorioTasasUsdt {
  return {
    async obtenerUltimaHasta(fechaMax: string) {
      const { data, error } = await cliente
        .from(TABLA)
        .select('fecha, usd, fuente')
        .eq('mercado', MERCADO)
        .lte('fecha', fechaMax)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) return null
      return data
    },

    async guardar(fila) {
      const { error } = await cliente.from(TABLA).upsert(
        {
          fecha: fila.fecha,
          mercado: MERCADO,
          usd: fila.usd,
          buy_rate: fila.buy_rate ?? null,
          sell_rate: fila.sell_rate ?? null,
          fuente: fila.fuente,
          notas: fila.notas ?? null,
        },
        { onConflict: 'fecha,mercado' }
      )
      if (error) throw error
    },
  }
}
