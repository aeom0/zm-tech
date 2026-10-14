import type { SupabaseClient } from '@supabase/supabase-js'
import {
  formatAppointmentWallclock,
  inicioDiaHoyEnZonaIANA,
  sumarDiasEnZonaIANA,
} from '@zmtech/tenant-config'

/** Motivo de cancelación que representa una inasistencia. */
export const NO_SHOW_CANCEL_REASON = 'no_show'

/**
 * Marca (o desmarca) que la clienta confirmó su cita. Es la misma columna que
 * llena el botón «Confirmo mi cita» del recordatorio WABA.
 */
export async function setAppointmentClientConfirmed(
  client: SupabaseClient,
  id: string,
  confirmed: boolean
): Promise<void> {
  const { error } = await client
    .from('appointments')
    .update({ client_confirmed_at: confirmed ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Asigna profesional a la cita y lo propaga a las líneas que no tenían uno o que
 * eran del profesional anterior, para que la agenda por profesional y las
 * comisiones queden consistentes. Las líneas de otro profesional (cita con dos
 * personas) se respetan.
 */
export async function assignAppointmentEmployee(
  client: SupabaseClient,
  appointmentId: string,
  employeeId: string
): Promise<void> {
  const { data: current, error: currentError } = await client
    .from('appointments')
    .select('employee_id')
    .eq('id', appointmentId)
    .maybeSingle()
  if (currentError) throw new Error(currentError.message)
  const previousId = (current as { employee_id: string | null } | null)?.employee_id ?? null

  const { error } = await client
    .from('appointments')
    .update({ employee_id: employeeId })
    .eq('id', appointmentId)
  if (error) throw new Error(error.message)

  if (previousId === employeeId) return
  let lines = client
    .from('appointment_services')
    .update({ employee_id: employeeId })
    .eq('appointment_id', appointmentId)
  lines = previousId
    ? lines.or(`employee_id.is.null,employee_id.eq.${previousId}`)
    : lines.is('employee_id', null)
  const { error: linesError } = await lines
  if (linesError) throw new Error(linesError.message)
}

export interface AssignWindowAppointment {
  id: string
  client_name: string
  date: string
  price: number
  service_id: string | null
  service_ids: string[]
  /** Servicios de `appointment_services` (citas multi-servicio). */
  line_service_ids: string[]
  employee_id: string | null
  status: string
  notes: string | null
}

/** Citas no canceladas desde `daysBack` días atrás hasta `daysAhead` días adelante. */
export async function fetchAssignWindow(
  client: SupabaseClient,
  args: { timeZone: string; daysBack?: number; daysAhead?: number }
): Promise<AssignWindowAppointment[]> {
  const today = inicioDiaHoyEnZonaIANA(args.timeZone)
  const start = sumarDiasEnZonaIANA(today, -(args.daysBack ?? 7), args.timeZone)
  const end = sumarDiasEnZonaIANA(today, args.daysAhead ?? 7, args.timeZone)

  const { data, error } = await client
    .from('appointments')
    .select('id, client_name, date, price, service_id, service_ids, employee_id, status, notes')
    .gte('date', formatAppointmentWallclock(start, args.timeZone))
    .lt('date', formatAppointmentWallclock(end, args.timeZone))
    .neq('status', 'cancelled')
    .order('date', { ascending: true })
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Omit<AssignWindowAppointment, 'line_service_ids'>[]
  if (rows.length === 0) return []

  const { data: lines, error: linesError } = await client
    .from('appointment_services')
    .select('appointment_id, service_id')
    .in(
      'appointment_id',
      rows.map((row) => row.id)
    )
  if (linesError) throw new Error(linesError.message)

  const byAppointment = new Map<string, string[]>()
  for (const line of (lines ?? []) as { appointment_id: string; service_id: string | null }[]) {
    const list = byAppointment.get(line.appointment_id) ?? []
    if (line.service_id) list.push(String(line.service_id))
    byAppointment.set(line.appointment_id, list)
  }

  return rows.map((row) => ({
    ...row,
    price: Number(row.price) || 0,
    service_ids: Array.isArray(row.service_ids) ? row.service_ids.map(String) : [],
    line_service_ids: byAppointment.get(row.id) ?? [],
  }))
}

/** Citas sin profesional en los próximos `days` días. */
export async function countUnassignedAppointments(
  client: SupabaseClient,
  timeZone: string,
  days = 7
): Promise<number> {
  const today = inicioDiaHoyEnZonaIANA(timeZone)
  const end = sumarDiasEnZonaIANA(today, days, timeZone)
  const { count, error } = await client
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .gte('date', formatAppointmentWallclock(today, timeZone))
    .lt('date', formatAppointmentWallclock(end, timeZone))
    .neq('status', 'cancelled')
    .is('employee_id', null)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export interface UnreviewedReferenceAppointment {
  id: string
  client_name: string
  date: string
  reference_image_paths: string[] | null
}

/** Citas con fotos de referencia que nadie revisó todavía. */
export async function fetchUnreviewedReferences(
  client: SupabaseClient
): Promise<UnreviewedReferenceAppointment[]> {
  const { data, error } = await client
    .from('appointments')
    .select('id, client_name, date, reference_image_paths')
    .not('reference_image_paths', 'is', null)
    .not('reference_image_paths', 'eq', '{}')
    .is('reference_reviewed_at', null)
    .order('date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as UnreviewedReferenceAppointment[]
}
