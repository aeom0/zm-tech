// Logica de negocio para manejo de fechas de tasas BCV.
// Incluye fines de semana, feriados bancarios VE y horario de publicacion 5pm.

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

/**
 * Feriados bancarios Venezuela -- el BCV no publica tasa estos dias.
 * La tasa del dia habil previo se mantiene vigente.
 *
 * Actualizar a inicio de cada año con el calendario oficial BCV/Sudeban.
 */
export const FERIADOS_BANCARIOS_VE: readonly string[] = [
  // 2025
  '2025-01-01',
  '2025-01-06',
  '2025-02-03',
  '2025-02-04',
  '2025-04-14',
  '2025-04-15',
  '2025-04-17',
  '2025-04-18',
  '2025-04-19',
  '2025-05-01',
  '2025-06-24',
  '2025-07-05',
  '2025-07-24',
  '2025-10-12',
  '2025-12-24',
  '2025-12-25',
  '2025-12-31',
  // 2026
  '2026-01-01',
  '2026-01-06',
  '2026-02-16',
  '2026-02-17',
  '2026-04-02',
  '2026-04-03',
  '2026-04-19',
  '2026-05-01',
  '2026-06-08',
  '2026-06-24',
  '2026-07-05',
  '2026-07-06',
  '2026-07-24',
  '2026-10-12',
  '2026-12-24',
  '2026-12-25',
  '2026-12-31',
]

/** Verifica si una fecha es feriado bancario en Venezuela. */
export function esFeriadoBancario(fecha: Date | string): boolean {
  const str = dayjs(fecha).format('YYYY-MM-DD')
  return (FERIADOS_BANCARIOS_VE as string[]).includes(str)
}

/** Retrocede al dia habil bancario anterior (no fin de semana, no feriado). Limite 14 dias. */
function retrocederADiaHabilBancario(dia: dayjs.Dayjs): string {
  let candidato = dia.subtract(1, 'day')
  let intentos = 0
  while (intentos < 14) {
    const dSemana = candidato.day()
    const esFinde = dSemana === 0 || dSemana === 6
    const esFeriado = esFeriadoBancario(candidato.toDate())
    if (!esFinde && !esFeriado) {
      return candidato.format('YYYY-MM-DD')
    }
    candidato = candidato.subtract(1, 'day')
    intentos++
  }
  return candidato.format('YYYY-MM-DD')
}

/**
 * Obtiene la fecha de referencia para la tasa BCV.
 *
 * Reglas (en orden):
 * 1. Sabado -> viernes (o dia habil anterior si el viernes es feriado)
 * 2. Domingo -> viernes (o dia habil anterior)
 * 3. Feriado bancario -> dia habil bancario anterior
 * 4. Lunes a viernes sin feriado -> misma fecha
 */
export function obtenerFechaReferenciaBCV(fecha: Date | string): string {
  const dia = dayjs(fecha)
  const diaSemana = dia.day() // 0 = Domingo, 6 = Sabado

  if (diaSemana === 0) {
    const viernes = dia.subtract(2, 'day')
    if (esFeriadoBancario(viernes.toDate())) {
      return retrocederADiaHabilBancario(viernes)
    }
    return viernes.format('YYYY-MM-DD')
  }

  if (diaSemana === 6) {
    const viernes = dia.subtract(1, 'day')
    if (esFeriadoBancario(viernes.toDate())) {
      return retrocederADiaHabilBancario(viernes)
    }
    return viernes.format('YYYY-MM-DD')
  }

  if (esFeriadoBancario(dia.toDate())) {
    return retrocederADiaHabilBancario(dia)
  }

  return dia.format('YYYY-MM-DD')
}

/** Verifica si una fecha es fin de semana (sabado o domingo). */
export function esFinDeSemana(fecha: Date | string): boolean {
  const dia = dayjs(fecha).day()
  return dia === 0 || dia === 6
}

/** Obtiene el viernes correspondiente a una fecha (util para tasas de fin de semana). */
export function obtenerViernesAnterior(fecha: Date | string): string {
  const dia = dayjs(fecha)
  const diaSemana = dia.day()

  if (diaSemana === 0) return dia.subtract(2, 'day').format('YYYY-MM-DD')
  if (diaSemana === 6) return dia.subtract(1, 'day').format('YYYY-MM-DD')

  const diasHastaViernes = 5 - diaSemana
  if (diasHastaViernes >= 0) {
    return dia.add(diasHastaViernes, 'day').format('YYYY-MM-DD')
  }
  return dia.subtract(diaSemana - 5, 'day').format('YYYY-MM-DD')
}

/** Venezuela UTC-4 (sin horario de verano). */
const OFFSET_VENEZUELA_HORAS = -4

/** Obtiene el momento actual en zona Venezuela (UTC-4). */
export function ahoraVenezuela(): dayjs.Dayjs {
  // utcOffset conserva la hora civil venezolana sin depender de la zona
  // horaria configurada en el dispositivo o en el runtime del servidor.
  return dayjs.utc().utcOffset(OFFSET_VENEZUELA_HORAS * 60)
}

/**
 * Formatea una fecha para display en español.
 * @param formato 'corto' | 'largo' | 'completo'
 */
export function formatearFechaDisplay(
  fecha: Date | string,
  formato: 'corto' | 'largo' | 'completo' = 'corto'
): string {
  const dia = dayjs(fecha)

  switch (formato) {
    case 'corto':
      return dia.format('DD/MM/YYYY')
    case 'largo':
      return dia.format('dddd, D [de] MMMM [de] YYYY')
    case 'completo':
      return dia.format('dddd, D [de] MMMM [de] YYYY [a las] HH:mm')
    default:
      return dia.format('DD/MM/YYYY')
  }
}
