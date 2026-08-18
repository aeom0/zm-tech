// Resolucion de tasa BCV -- solo lee desde BD.
//
// El scraping ocurre exclusivamente en el cron diario. La API publica
// (/api/bcv/tasa) y las apps solo leen lo que ya esta persistido.
//
// Prioridad de resolucion:
//   1. Fila exacta del dia de operacion VE (fechaRef)
//   2. Ultima fila oficial con fecha <= fechaRef (referencial del dia habil anterior)
//   3. Ultima fila incluyendo fuente=emergencia/manual
//   4. Error -- no hay tasa disponible

import { ahoraVenezuela, obtenerFechaReferenciaBCV } from '../logicaBCV'
import { respuestaSinTasaBcv } from './bcvProviders'

export interface FilaTasasBcv {
  fecha: string
  usd: number
  fuente?: string | null
}

export interface TasaBcvResuelta {
  usd: number
  fecha: string
  fuente: string
  esReferencial?: boolean
  aviso?: string
}

export interface RepositorioTasasBcv {
  obtenerPorFecha(fecha: string): Promise<FilaTasasBcv | null>
  /** Ultima fila con fecha <= fechaMax y usd > 0 */
  obtenerUltimaHasta(
    fechaMax: string,
    opciones?: { incluirEmergencia?: boolean }
  ): Promise<FilaTasasBcv | null>
  guardar(fila: {
    fecha: string
    usd: number
    fuente: string
    es_manual?: boolean
    es_fin_de_semana?: boolean
    notas?: string
  }): Promise<void>
}

function filaValida(fila: FilaTasasBcv | null | undefined): fila is FilaTasasBcv {
  if (!fila) return false
  const usd = Number(fila.usd)
  return Number.isFinite(usd) && usd > 0
}

function desdeFila(
  fila: FilaTasasBcv,
  fechaSolicitada: string,
  opts?: { esReferencial?: boolean; aviso?: string }
): TasaBcvResuelta {
  const fuente = fila.fuente === 'emergencia' ? 'emergencia' : (fila.fuente ?? 'bcv-oficial')
  return {
    usd: parseFloat(String(fila.usd)),
    fecha: fila.fecha,
    fuente,
    esReferencial: opts?.esReferencial ?? fila.fecha !== fechaSolicitada,
    aviso: opts?.aviso,
  }
}

export async function resolverTasaBcvOperacion(
  repo: RepositorioTasasBcv,
  opciones?: { fechaHoyVe?: string }
): Promise<
  { ok: true; tasa: TasaBcvResuelta } | { ok: false; body: ReturnType<typeof respuestaSinTasaBcv> }
> {
  const hoy = opciones?.fechaHoyVe ?? ahoraVenezuela().format('YYYY-MM-DD')
  const fechaRef = obtenerFechaReferenciaBCV(hoy)

  const exacta = await repo.obtenerPorFecha(fechaRef)
  if (filaValida(exacta)) {
    return { ok: true, tasa: desdeFila(exacta, fechaRef) }
  }

  const ultimaOficial = await repo.obtenerUltimaHasta(fechaRef, { incluirEmergencia: false })
  if (filaValida(ultimaOficial)) {
    const esReferencial = ultimaOficial.fecha !== fechaRef
    return {
      ok: true,
      tasa: desdeFila(ultimaOficial, fechaRef, {
        esReferencial,
        aviso: esReferencial
          ? `Tasa referencial del ${ultimaOficial.fecha} (no hay registro para ${fechaRef})`
          : undefined,
      }),
    }
  }

  const conEmergencia = await repo.obtenerUltimaHasta(fechaRef, { incluirEmergencia: true })
  if (filaValida(conEmergencia)) {
    return {
      ok: true,
      tasa: desdeFila(conEmergencia, fechaRef, {
        esReferencial: true,
        aviso:
          conEmergencia.fuente === 'emergencia' || conEmergencia.fuente === 'manual'
            ? 'Tasa de respaldo (manual o emergencia)'
            : `Tasa referencial del ${conEmergencia.fecha}`,
      }),
    }
  }

  return {
    ok: false,
    body: respuestaSinTasaBcv(
      `No hay tasa BCV en BD para ${fechaRef}. El cron diario no ha corrido o fallo.`,
      hoy
    ),
  }
}
