import type { SupabaseClient } from '@supabase/supabase-js'
import { formatoHoraHHMMEnZona, parseAppointmentWallclock } from '@zmtech/tenant-config'

import { checkEmployeesAvailability } from './availabilityCheck'

/**
 * Bloquea el guardado si algún profesional de la cita ya está ocupado en la franja,
 * contando también las citas donde participa por una línea de servicio. Mismo
 * criterio que el aviso en vivo (`checkEmployeesAvailability`).
 */
export async function guardOverlapForLines(
  client: SupabaseClient,
  args: {
    employeeIds: string[]
    dateIso: string
    durationMinutes: number
    timeZone: string
    excludeAppointmentId?: string | null
  }
): Promise<void> {
  const start = parseAppointmentWallclock(args.dateIso, args.timeZone)
  if (!start) throw new Error('La fecha de la cita no es válida.')
  const overlap = await checkEmployeesAvailability(client, {
    employeeIds: args.employeeIds,
    start,
    durationMinutes: args.durationMinutes,
    timeZone: args.timeZone,
    excludeAppointmentId: args.excludeAppointmentId,
  })
  if (overlap) {
    throw new Error(
      `Horario ocupado. Termina a las ${formatoHoraHHMMEnZona(overlap.busyUntil, args.timeZone)}.`
    )
  }
}
