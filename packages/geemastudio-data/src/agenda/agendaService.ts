import type { SupabaseClient } from '@supabase/supabase-js'
import { formatAppointmentWallclock } from '@zmtech/tenant-config'
import { findOrCreateClientId } from '../clients/clientLink'
import { computeServiceLinesTotals, lineDuration, lineUnitPrice } from './agendaUtils'
import { guardOverlapForLines } from './overlapGuard'
import type {
  AgendaAppointment,
  AgendaService,
  AgendaServiceLine,
  AppointmentCancelInput,
  AppointmentCreateInput,
  AppointmentRescheduleInput,
  AppointmentServiceItemRow,
} from './types'

function buildLineRows(lines: AgendaServiceLine[], services: AgendaService[]) {
  return lines.map((line) => ({
    service_id: line.serviceId,
    employee_id: line.employeeId || null,
    pack_id: line.packId ?? null,
    price: lineUnitPrice(line, services).toFixed(2),
    duration: lineDuration(line, services),
  }))
}

function buildServiceRows(
  appointmentId: string,
  lines: AgendaServiceLine[],
  services: AgendaService[],
  tenantId: string
) {
  return buildLineRows(lines, services).map((row) => ({
    appointment_id: appointmentId,
    ...row,
    tenant_id: tenantId,
  }))
}

export async function createAppointment(
  client: SupabaseClient,
  input: AppointmentCreateInput,
  services: AgendaService[]
): Promise<string> {
  if (input.lines.length === 0) {
    throw new Error('Selecciona al menos un servicio')
  }
  if (!input.tenantId) {
    throw new Error('No se pudo resolver el tenant')
  }

  const { totalPrice, totalDuration } = computeServiceLinesTotals(input.lines, services)
  const duration = totalDuration || 60

  await guardOverlapForLines(client, {
    employeeIds: input.lines.map((l) => l.employeeId),
    dateIso: input.date,
    durationMinutes: duration,
    timeZone: input.timeZone,
  })

  // Vincula la cita a la ficha del cliente (la crea si no existe); sin esto no aparece en Clientes ni en promos.
  const clientId = await findOrCreateClientId(client, {
    name: input.client_name,
    phone: input.client_phone,
    tenantId: input.tenantId,
  }).catch(() => null)

  const firstLine = input.lines[0]
  const payload: Record<string, unknown> = {
    tenant_id: input.tenantId,
    ...(clientId ? { client_id: clientId } : {}),
    client_name: input.client_name,
    client_phone: input.client_phone ?? null,
    client_document: input.client_document ?? null,
    service_id: firstLine.serviceId,
    employee_id: firstLine.employeeId,
    service_ids: input.lines.map((l) => l.serviceId),
    date: input.date,
    duration,
    price: totalPrice.toFixed(2),
    status: input.status ?? 'scheduled',
  }

  // Cita y líneas en una sola transacción: si falla una línea no queda cita huérfana.
  const { data: aptId, error } = await client.rpc('create_appointment_with_services', {
    p_appointment: payload,
    p_services: buildLineRows(input.lines, services),
  })

  if (error || !aptId) {
    throw new Error(error?.message ?? 'No se pudo crear la cita')
  }

  return String(aptId)
}

/**
 * Reprograma la cita (solo `date`). Los profesionales viven en `appointment_services`;
 * cambiarlos es editar las líneas (`updateAppointmentServices`), no reprogramar.
 */
export async function rescheduleAppointment(
  client: SupabaseClient,
  args: AppointmentRescheduleInput
): Promise<void> {
  await guardOverlapForLines(client, {
    employeeIds:
      args.employeeIds && args.employeeIds.length > 0 ? args.employeeIds : [args.employee_id],
    dateIso: args.date,
    durationMinutes: args.duration,
    timeZone: args.timeZone,
    excludeAppointmentId: args.id,
  })

  const { error } = await client.from('appointments').update({ date: args.date }).eq('id', args.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateAppointmentServices(
  client: SupabaseClient,
  args: {
    id: string
    date: string
    lines: AgendaServiceLine[]
    services: AgendaService[]
    tenantId: string
    timeZone: string
  }
): Promise<void> {
  if (args.lines.length === 0) {
    throw new Error('Selecciona al menos un servicio')
  }
  if (!args.tenantId) {
    throw new Error('No se pudo resolver el tenant')
  }

  const { totalPrice, totalDuration } = computeServiceLinesTotals(args.lines, args.services)
  const duration = totalDuration || 60

  await guardOverlapForLines(client, {
    employeeIds: args.lines.map((l) => l.employeeId),
    dateIso: args.date,
    durationMinutes: duration,
    timeZone: args.timeZone,
    excludeAppointmentId: args.id,
  })

  const firstLine = args.lines[0]
  const { error: aptError } = await client
    .from('appointments')
    .update({
      service_id: firstLine.serviceId,
      employee_id: firstLine.employeeId,
      service_ids: args.lines.map((l) => l.serviceId),
      duration,
      price: totalPrice.toFixed(2),
    })
    .eq('id', args.id)

  if (aptError) {
    throw new Error(aptError.message)
  }

  const { error: delError } = await client
    .from('appointment_services')
    .delete()
    .eq('appointment_id', args.id)

  if (delError) {
    throw new Error(delError.message)
  }

  const svcRows = buildServiceRows(args.id, args.lines, args.services, args.tenantId)
  const { error: insError } = await client.from('appointment_services').insert(svcRows)
  if (insError) {
    throw new Error(insError.message)
  }

  // El adelanto guarda el total del servicio: al agregar/quitar servicios, el saldo
  // pendiente en Pagos debe usar el nuevo total.
  const { error: payError } = await client
    .from('payments')
    .update({ service_total: totalPrice })
    .eq('appointment_id', args.id)
    .eq('is_abono', true)
  if (payError) {
    throw new Error(payError.message)
  }
}

export async function cancelAppointment(
  client: SupabaseClient,
  args: AppointmentCancelInput
): Promise<void> {
  const { error } = await client
    .from('appointments')
    .update({
      status: 'cancelled',
      cancel_reason: args.reason,
      cancel_note: args.note?.trim() || null,
      cancelled_at: formatAppointmentWallclock(new Date(), args.timeZone),
    })
    .eq('id', args.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function completeAppointment(
  client: SupabaseClient,
  id: string,
  status: string = 'completed'
): Promise<void> {
  const { error } = await client.from('appointments').update({ status }).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteAppointment(client: SupabaseClient, id: string): Promise<void> {
  const { error: linesError } = await client
    .from('appointment_services')
    .delete()
    .eq('appointment_id', id)
  if (linesError) {
    throw new Error(linesError.message)
  }
  const { error } = await client.from('appointments').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchAppointmentServices(
  client: SupabaseClient,
  appointmentId: string
): Promise<AppointmentServiceItemRow[]> {
  const { data, error } = await client
    .from('appointment_services')
    .select('id, appointment_id, service_id, employee_id, price, duration, pack_id')
    .eq('appointment_id', appointmentId)

  if (error) throw new Error(error.message)
  return (data ?? []) as AppointmentServiceItemRow[]
}

export async function fetchAppointmentDetail(
  client: SupabaseClient,
  appointmentId: string
): Promise<AgendaAppointment | null> {
  const { data, error } = await client
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as AgendaAppointment | null
}
