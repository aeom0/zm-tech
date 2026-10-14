import type { SupabaseClient } from '@supabase/supabase-js'
import { EMPTY_ELIGIBILITY } from './serviceEligibility'
import type {
  AffectedAppointment,
  CoverageInput,
  CoverageRecord,
  CoverageWindow,
  ServiceEligibilityIndex,
  TimeOffInput,
  TimeOffRecord,
  WorkShift,
} from './types'

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

// --- Servicios por profesional ------------------------------------------------

export async function fetchEmployeeDoesAll(
  client: SupabaseClient,
  employeeId: string
): Promise<boolean> {
  const { data, error } = await client
    .from('employees')
    .select('does_all_services')
    .eq('id', employeeId)
    .maybeSingle()
  fail(error)
  return data?.does_all_services ?? true
}

export async function setEmployeeDoesAll(
  client: SupabaseClient,
  employeeId: string,
  doesAll: boolean
): Promise<void> {
  const { error } = await client
    .from('employees')
    .update({ does_all_services: doesAll })
    .eq('id', employeeId)
  fail(error)
}

export async function fetchEmployeeServiceIds(
  client: SupabaseClient,
  employeeId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('employee_services')
    .select('service_id')
    .eq('employee_id', employeeId)
  fail(error)
  return (data ?? []).map((r) => String(r.service_id))
}

export async function fetchAllServiceCounts(
  client: SupabaseClient
): Promise<Record<string, number>> {
  const { data, error } = await client.from('employee_services').select('employee_id')
  fail(error)
  const counts: Record<string, number> = {}
  for (const r of data ?? []) {
    const id = String(r.employee_id)
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

export async function fetchAllEmployeeServices(client: SupabaseClient): Promise<{
  doesAllById: Record<string, boolean>
  countById: Record<string, number>
}> {
  const [emps, links] = await Promise.all([
    client.from('employees').select('id, does_all_services'),
    client.from('employee_services').select('employee_id'),
  ])
  fail(emps.error)
  fail(links.error)
  const doesAllById: Record<string, boolean> = {}
  for (const e of emps.data ?? []) doesAllById[String(e.id)] = e.does_all_services !== false
  const countById: Record<string, number> = {}
  for (const l of links.data ?? []) {
    const id = String(l.employee_id)
    countById[id] = (countById[id] ?? 0) + 1
  }
  return { doesAllById, countById }
}

export async function saveEmployeeServices(
  client: SupabaseClient,
  args: {
    employeeId: string
    doesAll: boolean
    serviceIds: string[]
  }
): Promise<void> {
  const { error } = await client.rpc('save_employee_services', {
    p_employee_id: args.employeeId,
    p_does_all: args.doesAll,
    p_service_ids: args.serviceIds,
  })
  fail(error)
}

export const setEmployeeServiceIds = saveEmployeeServices

// --- Horarios de trabajo por profesional -------------------------------------

export async function fetchWorkShifts(
  client: SupabaseClient,
  employeeId: string
): Promise<WorkShift[]> {
  const { data, error } = await client
    .from('employee_work_hours')
    .select('weekday, start_time, end_time')
    .eq('employee_id', employeeId)
    .order('weekday')
    .order('start_time')
  fail(error)
  return (data ?? []).map((r) => ({
    weekday: Number(r.weekday),
    start_time: String(r.start_time).slice(0, 5),
    end_time: String(r.end_time).slice(0, 5),
  }))
}

export async function fetchAllWorkShifts(
  client: SupabaseClient
): Promise<(WorkShift & { employee_id: string })[]> {
  const { data, error } = await client
    .from('employee_work_hours')
    .select('employee_id, weekday, start_time, end_time')
    .order('weekday')
    .order('start_time')
  fail(error)
  return (data ?? []) as (WorkShift & { employee_id: string })[]
}

export async function saveWorkShifts(
  client: SupabaseClient,
  employeeId: string,
  shifts: WorkShift[]
): Promise<void> {
  const { error } = await client.rpc('save_employee_work_hours', {
    p_employee_id: employeeId,
    p_shifts: shifts,
  })
  fail(error)
}

export async function fetchBookingLeadDays(
  client: SupabaseClient,
  employeeId: string
): Promise<number> {
  const { data, error } = await client
    .from('employees')
    .select('booking_lead_days')
    .eq('id', employeeId)
    .maybeSingle()
  fail(error)
  return data?.booking_lead_days ?? 0
}

export async function saveBookingLeadDays(
  client: SupabaseClient,
  employeeId: string,
  days: number
): Promise<void> {
  const lead = Math.min(30, Math.max(0, Math.trunc(days)))
  const { error } = await client
    .from('employees')
    .update({ booking_lead_days: lead })
    .eq('id', employeeId)
  fail(error)
}

// --- Ausencias (bloqueos) ----------------------------------------------------

export async function fetchTimeOff(
  client: SupabaseClient,
  employeeId: string
): Promise<TimeOffRecord[]> {
  const { data, error } = await client
    .from('employee_time_off')
    .select('id, employee_id, kind, date_from, date_to, start_time, end_time, reason, is_paid')
    .eq('employee_id', employeeId)
    .order('date_from', { ascending: false })
  fail(error)
  return (data ?? []) as TimeOffRecord[]
}

export async function fetchAllTimeOff(client: SupabaseClient): Promise<TimeOffRecord[]> {
  const { data, error } = await client
    .from('employee_time_off')
    .select('id, employee_id, kind, date_from, date_to, start_time, end_time, reason, is_paid')
    .order('date_from', { ascending: true })
  fail(error)
  return (data ?? []) as TimeOffRecord[]
}

export async function insertTimeOff(client: SupabaseClient, input: TimeOffInput): Promise<void> {
  const { error } = await client.from('employee_time_off').insert(input)
  fail(error)
}

export async function deleteTimeOff(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('employee_time_off').delete().eq('id', id)
  fail(error)
}

// --- Coberturas ---------------------------------------------------------------

export async function fetchCoverages(client: SupabaseClient): Promise<CoverageRecord[]> {
  const { data, error } = await client
    .from('employee_coverages')
    .select('id, covered_employee_id, covering_employee_id, date_from, date_to, note')
    .order('date_from', { ascending: false })
  fail(error)
  return (data ?? []) as CoverageRecord[]
}

export async function insertCoverage(client: SupabaseClient, input: CoverageInput): Promise<void> {
  const { error } = await client.from('employee_coverages').insert(input)
  fail(error)
}

export async function deleteCoverage(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('employee_coverages').delete().eq('id', id)
  fail(error)
}

// --- Citas afectadas por una ausencia o cobertura -----------------------------

export async function fetchAffectedAppointments(
  client: SupabaseClient,
  args: {
    employeeId: string
    dateFrom: string
    dateTo: string | null
    startTime?: string | null
    endTime?: string | null
  }
): Promise<AffectedAppointment[]> {
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

// --- Agenda: disponibilidad de un día -----------------------------------------

export interface DayAvailability {
  timeOff: TimeOffRecord[]
  coverages: CoverageRecord[]
  shifts: (WorkShift & { employee_id: string })[]
}

/** Ausencias, coberturas y turnos que afectan a un día (YYYY-MM-DD). */
export async function fetchDayAvailability(
  client: SupabaseClient,
  dayIso: string
): Promise<DayAvailability> {
  const weekday = new Date(`${dayIso}T00:00:00Z`).getUTCDay()
  const [timeOff, coverages, shifts] = await Promise.all([
    client
      .from('employee_time_off')
      .select('id, employee_id, kind, date_from, date_to, start_time, end_time, reason, is_paid')
      .lte('date_from', dayIso)
      .or(`date_to.is.null,date_to.gte.${dayIso}`),
    client
      .from('employee_coverages')
      .select('id, covered_employee_id, covering_employee_id, date_from, date_to, note')
      .lte('date_from', dayIso)
      .gte('date_to', dayIso),
    client
      .from('employee_work_hours')
      .select('employee_id, weekday, start_time, end_time')
      .eq('weekday', weekday),
  ])
  fail(timeOff.error)
  fail(coverages.error)
  fail(shifts.error)
  return {
    timeOff: (timeOff.data ?? []) as TimeOffRecord[],
    coverages: (coverages.data ?? []) as CoverageRecord[],
    shifts: (shifts.data ?? []) as (WorkShift & { employee_id: string })[],
  }
}

// --- Índice para asignarProfesionales -----------------------------------------

export async function fetchServiceEligibility(
  client: SupabaseClient
): Promise<ServiceEligibilityIndex> {
  const [employees, links, coverages] = await Promise.all([
    client.from('employees').select('id, does_all_services').eq('is_active', true),
    client.from('employee_services').select('employee_id, service_id'),
    client
      .from('employee_coverages')
      .select('covered_employee_id, covering_employee_id, date_from, date_to'),
  ])
  fail(employees.error)
  fail(links.error)
  fail(coverages.error)

  const doesAll = new Set<string>()
  for (const row of employees.data ?? []) {
    if (row.does_all_services) doesAll.add(String(row.id))
  }
  const serviceIdsByEmployee = new Map<string, Set<string>>()
  for (const row of links.data ?? []) {
    const employeeId = String(row.employee_id)
    const set = serviceIdsByEmployee.get(employeeId) ?? new Set<string>()
    set.add(String(row.service_id))
    serviceIdsByEmployee.set(employeeId, set)
  }
  const windows: CoverageWindow[] = (coverages.data ?? []).map((row) => ({
    coveredId: String(row.covered_employee_id),
    coveringId: String(row.covering_employee_id),
    dateFrom: String(row.date_from).slice(0, 10),
    dateTo: String(row.date_to).slice(0, 10),
  }))
  return { doesAll, serviceIdsByEmployee, coverages: windows }
}

export const fetchServiceEligibilityIndex = fetchServiceEligibility
export { EMPTY_ELIGIBILITY }
