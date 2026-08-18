import type { FilaTasasBcv, RepositorioTasasBcv } from './bcvTasaResolver'

/** Cliente Supabase minimo (evita dependencia dura de @supabase/supabase-js en el paquete). */
export type ClienteTasasBcv = {
  from: (tabla: string) => {
    select: (columnas: string) => QueryTasasBcv
    upsert: (
      row: Record<string, unknown>,
      opts: { onConflict: string }
    ) => PromiseLike<{ error: unknown }>
  }
}

type QueryTasasBcv = {
  eq: (col: string, val: string) => QueryTasasBcv
  lte: (col: string, val: string) => QueryTasasBcv
  gt: (col: string, val: number) => QueryTasasBcv
  neq: (col: string, val: string) => QueryTasasBcv
  order: (col: string, opts: { ascending: boolean }) => QueryTasasBcv
  limit: (n: number) => QueryTasasBcv
  maybeSingle: () => PromiseLike<{ data: FilaTasasBcv | null; error: unknown }>
}

/** Tabla compartida cross-producto: hub_tasas_bcv (ver docs/hub/supabase/migrations/). */
const TABLA = 'hub_tasas_bcv'

export function crearRepositorioTasasBcv(cliente: ClienteTasasBcv): RepositorioTasasBcv {
  return {
    async obtenerPorFecha(fecha: string) {
      const { data, error } = await cliente
        .from(TABLA)
        .select('fecha, usd, fuente')
        .eq('fecha', fecha)
        .maybeSingle()
      if (error) return null
      return data
    },

    async obtenerUltimaHasta(fechaMax: string, opciones?: { incluirEmergencia?: boolean }) {
      let query = cliente
        .from(TABLA)
        .select('fecha, usd, fuente')
        .lte('fecha', fechaMax)
        .gt('usd', 0)

      if (!opciones?.incluirEmergencia) {
        query = query.neq('fuente', 'emergencia')
      }

      const { data, error } = await query.order('fecha', { ascending: false }).limit(1).maybeSingle()
      if (error) return null
      return data
    },

    async guardar(fila) {
      const { error } = await cliente.from(TABLA).upsert(
        {
          fecha: fila.fecha,
          usd: fila.usd,
          fuente: fila.fuente,
          es_manual: fila.es_manual ?? false,
          es_fin_de_semana: fila.es_fin_de_semana ?? false,
          notas: fila.notas ?? null,
        },
        { onConflict: 'fecha' }
      )
      if (error) throw error
    },
  }
}
