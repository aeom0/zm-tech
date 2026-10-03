import type { EmployeeTimeOffKind } from '@geemastudio/shared-schema'

import { supabase } from '@/lib/supabase'

function db() {
  return supabase
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** Fila de BD con los nombres de columna reales (snake_case). */
export interface TimeOffRecord {
  id: string
  employee_id: string
  kind: EmployeeTimeOffKind
  date_from: string
  date_to: string | null
  start_time: string | null
  end_time: string | null
  reason: string | null
  is_paid: boolean | null
}

export interface CoverageRecord {
  id: string
  covered_employee_id: string
  covering_employee_id: string
  date_from: string
  date_to: string
  note: string | null
}

export interface WorkShift {
  weekday: number
  start_time: string
  end_time: string
}

export interface TimeOffInput {
  employee_id: string
  kind: EmployeeTimeOffKind
  date_from: string
  date_to: string | null
  start_time: string | null
  end_time: string | null
  reason: string | null
  is_paid: boolean | null
}

export interface CoverageInput {
  covered_employee_id: string
  covering_employee_id: string
  date_from: string
  date_to: string
  note: string | null
}

export interface AffectedAppointment {
  id: string
  date: string
  client_name: string | null
  duration: number | null
}

// --- Servicios por profesional ------------------------------------------------

export async function fetchEmployeeDoesAll(employeeId: string): Promise<boolean> {
  const { data, error } = await db()
    .from('employees')
    .select('does_all_services')
    .eq('id', employeeId)
    .maybeSingle()
  fail(error)
  return data?.does_all_services ?? true
}

export async function fetchEmployeeServiceIds(employeeId: string): Promise<string[]> {
  const { data, error } = await db()
    .from('employee_services')
    .select('service_id')
    .eq('employee_id', employeeId)
  fail(error)
  return (data ?? []).map((r) => String(r.service_id))
}

/** Reemplaza la lista de servicios y la bandera "hace todos" en una sola transacción. */
export async function saveEmployeeServices(args: {
  employeeId: string
  doesAll: boolean
  serviceIds: string[]
}): Promise<void> {
  const { error } = await db().rpc('save_employee_services', {
    p_employee_id: args.employeeId,
    p_does_all: args.doesAll,
    p_service_ids: args.serviceIds,
  })
  fail(error)
}

// --- Horario semanal ----------------------------------------------------------

export async function fetchWorkShifts(employeeId: string): Promise<WorkShift[]> {
  const { data, error } = await db()
    .from('employee_work_hours')
    .select('weekday, start_time, end_time')
    .eq('employee_id', employeeId)
    .order('weekday')
    .order('start_time')
  fail(error)
  return (data ?? []) as WorkShift[]
}

/** Lista vacía = hereda el horario del negocio. Una sola transacción. */
export async function saveWorkShifts(employeeId: string, shifts: WorkShift[]): Promise<void> {
  const { error } = await db().rpc('save_employee_work_hours', {
    p_employee_id: employeeId,
    p_shifts: shifts,
  })
  fail(error)
}

// --- Ausencias ----------------------------------------------------------------

export async function fetchTimeOff(employeeId: string): Promise<TimeOffRecord[]> {
  const { data, error } = await db()
    .from('employee_time_off')
    .select('id, employee_id, kind, date_from, date_to, start_time, end_time, reason, is_paid')
    .eq('employee_id', employeeId)
    .order('date_from', { ascending: false })
  fail(error)
  return (data ?? []) as TimeOffRecord[]
}

export async function insertTimeOff(input: TimeOffInput): Promise<void> {
  const { error } = await db().from('employee_time_off').insert(input)
  fail(error)
}

export async function deleteTimeOff(id: string): Promise<void> {
  const { error } = await db().from('employee_time_off').delete().eq('id', id)
  fail(error)
}

// --- Coberturas ---------------------------------------------------------------

export async function fetchCoverages(): Promise<CoverageRecord[]> {
  const { data, error } = await db()
    .from('employee_coverages')
    .select('id, covered_employee_id, covering_employee_id, date_from, date_to, note')
    .order('date_from', { ascending: false })
  fail(error)
  return (data ?? []) as CoverageRecord[]
}

export async function insertCoverage(input: CoverageInput): Promise<void> {
  const { error } = await db().from('employee_coverages').insert(input)
  fail(error)
}

export async function deleteCoverage(id: string): Promise<void> {
  const { error } = await db().from('employee_coverages').delete().eq('id', id)
  fail(error)
}

// --- Citas afectadas por una ausencia o cobertura -----------------------------

/**
 * Citas no canceladas de la profesional dentro del rango (fechas locales del tenant).
 * Considera `appointments.employee_id` y `appointment_services.employee_id`.
 * `dateTo` null = hasta nuevo aviso (solo citas futuras desde `dateFrom`).
 * Con `startTime`/`endTime` solo cuenta las que se solapan con esa franja.
 */
export async function fetchAffectedAppointments(args: {
  employeeId: string
  dateFrom: string
  dateTo: string | null
  startTime?: string | null
  endTime?: string | null
}): Promise<AffectedAppointment[]> {
  const client = db()
  const from = `${args.dateFrom}T00:00:00`
  const to = args.dateTo ? `${args.dateTo}T23:59:59` : null

  let direct = client
    .from('appointments')
    .select('id, date, client_name, duration')
    .eq('employee_id', args.employeeId)
    .neq('status', 'cancelled')
    .gte('date', from)
  if (to) direct = direct.lte('date', to)
  const { data: byAppointment, error: e1 } = await direct
  fail(e1)

  const { data: lines, error: e2 } = await client
    .from('appointment_services')
    .select('appointment_id')
    .eq('employee_id', args.employeeId)
  fail(e2)

  const known = new Set((byAppointment ?? []).map((a) => String(a.id)))
  const extraIds = Array.from(
    new Set((lines ?? []).map((l) => String(l.appointment_id)).filter((id) => !known.has(id)))
  )

  let extra: typeof byAppointment = []
  if (extraIds.length > 0) {
    let q = client
      .from('appointments')
      .select('id, date, client_name, duration')
      .in('id', extraIds)
      .neq('status', 'cancelled')
      .gte('date', from)
    if (to) q = q.lte('date', to)
    const { data, error } = await q
    fail(error)
    extra = data ?? []
  }

  const all = [...(byAppointment ?? []), ...(extra ?? [])] as AffectedAppointment[]
  const { startTime, endTime } = args
  const filtered =
    startTime && endTime
      ? all.filter((a) => {
          const start = a.date.slice(11, 16)
          const [h, m] = start.split(':').map(Number)
          const endMin = (h ?? 0) * 60 + (m ?? 0) + (a.duration ?? 0)
          const [sh, sm] = startTime.split(':').map(Number)
          const [eh, em] = endTime.split(':').map(Number)
          const startMin = (h ?? 0) * 60 + (m ?? 0)
          return startMin < (eh ?? 0) * 60 + (em ?? 0) && endMin > (sh ?? 0) * 60 + (sm ?? 0)
        })
      : all
  return filtered.sort((a, b) => a.date.localeCompare(b.date))
}
