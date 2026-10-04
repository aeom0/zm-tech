import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { EMPLOYEES_QUERY_KEY } from './useEmployeesData'
import {
  deleteCoverage,
  deleteTimeOff,
  fetchAffectedAppointments,
  fetchCoverages,
  fetchEmployeeDoesAll,
  fetchEmployeeServiceIds,
  fetchServiceEligibility,
  fetchTimeOff,
  fetchBookingLeadDays,
  fetchWorkShifts,
  insertCoverage,
  insertTimeOff,
  saveBookingLeadDays,
  saveEmployeeServices,
  saveWorkShifts,
  type CoverageInput,
  type TimeOffInput,
  type WorkShift,
} from '../lib/availabilityAdapter'

export const SERVICE_ELIGIBILITY_KEY = ['service_eligibility'] as const

const servicesKey = (id: string) => ['employee_services', id] as const
const hoursKey = (id: string) => ['employee_work_hours', id] as const
const leadKey = (id: string) => ['employee_booking_lead', id] as const
const timeOffKey = (id: string) => ['employee_time_off', id] as const
const COVERAGES_KEY = ['employee_coverages'] as const

export function useEmployeeServices(employeeId: string) {
  return useQuery({
    queryKey: servicesKey(employeeId),
    queryFn: async () => ({
      doesAll: await fetchEmployeeDoesAll(employeeId),
      serviceIds: await fetchEmployeeServiceIds(employeeId),
    }),
  })
}

export function useSaveEmployeeServices(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { doesAll: boolean; serviceIds: string[] }) =>
      saveEmployeeServices({ employeeId, ...args }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: servicesKey(employeeId) })
      void qc.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
      void qc.invalidateQueries({ queryKey: SERVICE_ELIGIBILITY_KEY })
    },
  })
}

export function useWorkShifts(employeeId: string) {
  return useQuery({
    queryKey: hoursKey(employeeId),
    queryFn: () => fetchWorkShifts(employeeId),
  })
}

export function useSaveWorkShifts(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shifts: WorkShift[]) => saveWorkShifts(employeeId, shifts),
    onSuccess: () => void qc.invalidateQueries({ queryKey: hoursKey(employeeId) }),
  })
}

export function useBookingLeadDays(employeeId: string) {
  return useQuery({
    queryKey: leadKey(employeeId),
    queryFn: () => fetchBookingLeadDays(employeeId),
  })
}

export function useSaveBookingLeadDays(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (days: number) => saveBookingLeadDays(employeeId, days),
    onSuccess: () => void qc.invalidateQueries({ queryKey: leadKey(employeeId) }),
  })
}

export function useTimeOff(employeeId: string) {
  return useQuery({
    queryKey: timeOffKey(employeeId),
    queryFn: () => fetchTimeOff(employeeId),
  })
}

export function useAddTimeOff(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TimeOffInput) => insertTimeOff(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: timeOffKey(employeeId) }),
  })
}

export function useDeleteTimeOff(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTimeOff(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: timeOffKey(employeeId) }),
  })
}

export function useCoverages() {
  return useQuery({ queryKey: COVERAGES_KEY, queryFn: fetchCoverages })
}

export function useAddCoverage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CoverageInput) => insertCoverage(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: COVERAGES_KEY })
      void qc.invalidateQueries({ queryKey: SERVICE_ELIGIBILITY_KEY })
    },
  })
}

export function useDeleteCoverage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCoverage(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: COVERAGES_KEY })
      void qc.invalidateQueries({ queryKey: SERVICE_ELIGIBILITY_KEY })
    },
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
    queryKey: ['affected_appointments', args],
    enabled: !!args && !!args.dateFrom,
    queryFn: () => fetchAffectedAppointments(args!),
  })
}

export function useServiceEligibility() {
  return useQuery({
    queryKey: SERVICE_ELIGIBILITY_KEY,
    staleTime: 60_000,
    queryFn: fetchServiceEligibility,
  })
}
