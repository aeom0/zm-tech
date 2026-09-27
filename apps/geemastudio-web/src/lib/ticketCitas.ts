import { supabase } from '@/lib/supabase'

export interface TicketCitasCompletadas {
  citas: number
  /** Cobrado de la cita, o su precio si todavía no tiene pagos. Null si no hay citas. */
  ticket: number | null
}

function monto(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

/**
 * Ticket promedio de las citas completadas entre dos marcas de hora de pared
 * del tenant (`YYYY-MM-DD HH:mm:ss`). `hastaExclusivo` no se incluye.
 *
 * Cada cita suma sus pagos (incluye abonos). Si no hay pagos, usa el precio
 * de la cita. No se divide entre clientes sin visitas ni entre pagos sueltos.
 */
export async function ticketCitasCompletadas(
  desde: string,
  hastaExclusivo: string
): Promise<TicketCitasCompletadas> {
  if (!supabase) throw new Error('Supabase no configurado')

  const { data: citas, error } = await supabase
    .from('appointments')
    .select('id, price')
    .eq('status', 'completed')
    .gte('date', desde)
    .lt('date', hastaExclusivo)

  if (error) throw new Error(error.message)

  const filas = citas ?? []
  if (filas.length === 0) return { citas: 0, ticket: null }

  const cobrado = new Map<string, number>()
  const ids = filas.map((cita) => String(cita.id))

  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100)
    const { data: pagos, error: payErr } = await supabase
      .from('payments')
      .select('appointment_id, amount')
      .in('appointment_id', slice)
    if (payErr) throw new Error(payErr.message)
    for (const pago of pagos ?? []) {
      const citaId = pago.appointment_id == null ? '' : String(pago.appointment_id)
      if (!citaId) continue
      cobrado.set(citaId, (cobrado.get(citaId) ?? 0) + monto(pago.amount as string | number))
    }
  }

  let total = 0
  for (const cita of filas) {
    const pagosCita = cobrado.get(String(cita.id))
    total += pagosCita != null && pagosCita > 0 ? pagosCita : monto(cita.price as string | number)
  }

  return { citas: filas.length, ticket: total / filas.length }
}

/** Día calendario siguiente, en UTC, para cerrar un rango inclusivo `YYYY-MM-DD`. */
export function diaSiguiente(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  const mes = String(next.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(next.getUTCDate()).padStart(2, '0')
  return `${next.getUTCFullYear()}-${mes}-${dia}`
}
