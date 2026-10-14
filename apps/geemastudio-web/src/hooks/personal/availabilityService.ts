'use client'

import { supabase } from '@/lib/supabase'
import {
  deleteCoverage as deleteCoverageData,
  deleteTimeOff as deleteTimeOffData,
  fetchAllServiceCounts as fetchAllServiceCountsData,
  fetchAllTimeOff as fetchAllTimeOffData,
  fetchAffectedAppointments as fetchAffectedAppointmentsData,
  fetchBookingLeadDays as fetchBookingLeadDaysData,
  fetchCoverages as fetchCoveragesData,
  fetchDayAvailability as fetchDayAvailabilityData,
  fetchEmployeeDoesAll as fetchEmployeeDoesAllData,
  fetchEmployeeServiceIds as fetchEmployeeServiceIdsData,
  fetchTimeOff as fetchTimeOffData,
  fetchWorkShifts as fetchWorkShiftsData,
  fetchAllWorkShifts as fetchAllWorkShiftsData,
  insertCoverage as insertCoverageData,
  insertTimeOff as insertTimeOffData,
  saveBookingLeadDays as saveBookingLeadDaysData,
  saveEmployeeServices as saveEmployeeServicesData,
  saveWorkShifts as saveWorkShiftsData,
  setEmployeeDoesAll as setEmployeeDoesAllData,
  type AffectedAppointment,
  type CoverageInput,
  type CoverageRecord,
  type DayAvailability,
  type TimeOffInput,
  type TimeOffRecord,
  type WorkShift,
} from '@geemastudio/data'

export type {
  TimeOffRecord,
  CoverageRecord,
  WorkShift,
  TimeOffInput,
  CoverageInput,
  AffectedAppointment,
  DayAvailability,
}

function db() {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return supabase
}

export async function fetchEmployeeDoesAll(employeeId: string): Promise<boolean> {
  return fetchEmployeeDoesAllData(db(), employeeId)
}

export async function setEmployeeDoesAll(employeeId: string, doesAll: boolean): Promise<void> {
  return setEmployeeDoesAllData(db(), employeeId, doesAll)
}

export async function fetchEmployeeServiceIds(employeeId: string): Promise<string[]> {
  return fetchEmployeeServiceIdsData(db(), employeeId)
}

export async function fetchAllServiceCounts(): Promise<Record<string, number>> {
  return fetchAllServiceCountsData(db())
}

export async function saveEmployeeServices(args: {
  employeeId: string
  doesAll: boolean
  serviceIds: string[]
}): Promise<void> {
  return saveEmployeeServicesData(db(), args)
}

export async function fetchWorkShifts(employeeId: string): Promise<WorkShift[]> {
  return fetchWorkShiftsData(db(), employeeId)
}

export async function fetchAllWorkShifts(): Promise<(WorkShift & { employee_id: string })[]> {
  return fetchAllWorkShiftsData(db())
}

export async function saveWorkShifts(employeeId: string, shifts: WorkShift[]): Promise<void> {
  return saveWorkShiftsData(db(), employeeId, shifts)
}

export async function fetchBookingLeadDays(employeeId: string): Promise<number> {
  return fetchBookingLeadDaysData(db(), employeeId)
}

export async function saveBookingLeadDays(employeeId: string, days: number): Promise<void> {
  return saveBookingLeadDaysData(db(), employeeId, days)
}

export async function fetchTimeOff(employeeId: string): Promise<TimeOffRecord[]> {
  return fetchTimeOffData(db(), employeeId)
}

export async function fetchAllTimeOff(): Promise<TimeOffRecord[]> {
  return fetchAllTimeOffData(db())
}

export async function insertTimeOff(input: TimeOffInput): Promise<void> {
  return insertTimeOffData(db(), input)
}

export async function deleteTimeOff(id: string): Promise<void> {
  return deleteTimeOffData(db(), id)
}

export async function fetchCoverages(): Promise<CoverageRecord[]> {
  return fetchCoveragesData(db())
}

export async function insertCoverage(input: CoverageInput): Promise<void> {
  return insertCoverageData(db(), input)
}

export async function deleteCoverage(id: string): Promise<void> {
  return deleteCoverageData(db(), id)
}

export async function fetchAffectedAppointments(args: {
  employeeId: string
  dateFrom: string
  dateTo: string | null
  startTime?: string | null
  endTime?: string | null
}): Promise<AffectedAppointment[]> {
  return fetchAffectedAppointmentsData(db(), args)
}

export async function fetchDayAvailability(dayIso: string): Promise<DayAvailability> {
  return fetchDayAvailabilityData(db(), dayIso)
}
