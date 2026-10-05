'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteCoverage,
  deleteTimeOff,
  fetchAffectedAppointments,
  fetchAllServiceCounts,
  fetchAllTimeOff,
  fetchAllWorkShifts,
  fetchBookingLeadDays,
  fetchCoverages,
  fetchDayAvailability,
  fetchEmployeeServiceIds,
  fetchTimeOff,
  fetchWorkShifts,
  insertCoverage,
  insertTimeOff,
  saveBookingLeadDays,
  saveEmployeeServices,
  saveWorkShifts,
  type CoverageInput,
  type TimeOffInput,
  type WorkShift,
} from './availabilityService'
import { supabase } from '@/lib/supabase'

import { WEB_EMPLOYEES_KEY } from './useEmployees'

const servicesKey = (id: string) => ['web_employee_services', id] as const
const hoursKey = (id: string) => ['web_employee_work_hours', id] as const
const leadKey = (id: string) => ['web_employee_booking_lead', id] as const
const timeOffKey = (id: string) => ['web_employee_time_off', id] as const
const ALL_SERVICES_KEY = ['web_employee_services'] as const
const ALL_HOURS_KEY = ['web_employee_work_hours'] as const
const ALL_TIME_OFF_KEY = ['web_employee_time_off'] as const
const COVERAGES_KEY = ['web_employee_coverages'] as const

export function useEmployeeServiceIds(employeeId: string | undefined) {
  return useQuery({
    queryKey: servicesKey(employeeId ?? ''),
    enabled: !!employeeId,
    queryFn: () => fetchEmployeeServiceIds(employeeId!),
  })
}

export function useSaveEmployeeServices(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { doesAll: boolean; serviceIds: string[] }) =>
      saveEmployeeServices({ employeeId, ...args }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ALL_SERVICES_KEY })
      void qc.invalidateQueries({ queryKey: WEB_EMPLOYEES_KEY })
    },
  })
}

export function useWorkShifts(employeeId: string | undefined) {
  return useQuery({
    queryKey: hoursKey(employeeId ?? ''),
    enabled: !!employeeId,
    queryFn: () => fetchWorkShifts(employeeId!),
  })
}

export function useSaveWorkShifts(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shifts: WorkShift[]) => saveWorkShifts(employeeId, shifts),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ALL_HOURS_KEY }),
  })
}

export function useBookingLeadDays(employeeId: string | undefined) {
  return useQuery({
    queryKey: leadKey(employeeId ?? ''),
    enabled: !!employeeId,
    queryFn: () => fetchBookingLeadDays(employeeId!),
  })
}

export function useSaveBookingLeadDays(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (days: number) => saveBookingLeadDays(employeeId, days),
    onSuccess: () => void qc.invalidateQueries({ queryKey: leadKey(employeeId) }),
  })
}

export function useTimeOff(employeeId: string | undefined) {
  return useQuery({
    queryKey: timeOffKey(employeeId ?? ''),
    enabled: !!employeeId,
    queryFn: () => fetchTimeOff(employeeId!),
  })
}

/** Datos de todo el equipo para las pantallas Horarios, Ausencias y Servicios. */
export function useAllTimeOff() {
  return useQuery({ queryKey: [...ALL_TIME_OFF_KEY, 'all'], queryFn: fetchAllTimeOff })
}

export function useAllWorkShifts() {
  return useQuery({ queryKey: [...ALL_HOURS_KEY, 'all'], queryFn: fetchAllWorkShifts })
}

export function useAllServiceCounts() {
  return useQuery({ queryKey: [...ALL_SERVICES_KEY, 'all'], queryFn: fetchAllServiceCounts })
}

export function useAddTimeOff(_employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TimeOffInput) => insertTimeOff(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ALL_TIME_OFF_KEY }),
  })
}

export function useDeleteTimeOff(_employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTimeOff(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ALL_TIME_OFF_KEY }),
  })
}

export function useCoverages() {
  return useQuery({ queryKey: COVERAGES_KEY, queryFn: fetchCoverages })
}

export function useAddCoverage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CoverageInput) => insertCoverage(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVERAGES_KEY }),
  })
}

export function useDeleteCoverage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCoverage(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVERAGES_KEY }),
  })
}

/** Citas que una ausencia/cobertura dejaría sin profesional (consulta bajo demanda). */
export function useAffectedAppointments(
  args: {
    employeeId: string
    dateFrom: string
    dateTo: string | null
    startTime?: string | null
    endTime?: string | null
  } | null
) {
  return useQuery({
    queryKey: ['web_affected_appointments', args],
    enabled: !!args && !!args.dateFrom,
    queryFn: () => fetchAffectedAppointments(args!),
  })
}

export function useDayAvailability(dayIso: string | null) {
  return useQuery({
    queryKey: ['agenda_day_availability', dayIso],
    enabled: !!supabase && !!dayIso,
    staleTime: 30_000,
    queryFn: () => fetchDayAvailability(dayIso!),
  })
}
