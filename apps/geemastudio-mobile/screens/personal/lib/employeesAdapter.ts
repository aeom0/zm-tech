import type { CommissionMode, PaymentMode } from '@geemastudio/shared-schema'
import {
  createEmployee as createEmployeeData,
  deleteEmployee as deleteEmployeeData,
  detectEmployeesDialect as detectEmployeesDialectData,
  EMPLOYEE_SELECT_GEEMA,
  EMPLOYEE_SELECT_ZM,
  fetchEmployeeById as fetchEmployeeByIdData,
  fetchEmployees as fetchEmployeesData,
  reorderEmployees as reorderEmployeesData,
  rowToEmployee as rowToEmployeeData,
  toEmployeeWritePayload as toEmployeeWritePayloadData,
  type EmployeeRawRow,
  type EmployeeRow,
  type EmployeesDialect,
  type EmployeeWriteInput,
  updateEmployee as updateEmployeeData,
  uploadEmployeeAvatar as uploadEmployeeAvatarData,
} from '@geemastudio/data'

import { supabase } from '@/lib/supabase'

export type { EmployeesDialect, EmployeeRow, EmployeeRawRow, EmployeeWriteInput }
export { EMPLOYEE_SELECT_ZM, EMPLOYEE_SELECT_GEEMA }

export async function detectEmployeesDialect(): Promise<EmployeesDialect> {
  return detectEmployeesDialectData(supabase)
}

export function rowToEmployee(row: EmployeeRawRow, dialect: EmployeesDialect): EmployeeRow {
  return rowToEmployeeData(row, dialect)
}

export function toEmployeeWritePayload(
  input: EmployeeWriteInput,
  dialect: EmployeesDialect
): Record<string, unknown> {
  return toEmployeeWritePayloadData(input, dialect)
}

export async function fetchAllEmployees(): Promise<EmployeeRow[]> {
  return fetchEmployeesData(supabase)
}

export async function reorderEmployees(orderedIds: string[]): Promise<void> {
  return reorderEmployeesData(supabase, orderedIds)
}

export async function fetchEmployeeById(id: string): Promise<EmployeeRow | null> {
  return fetchEmployeeByIdData(supabase, id)
}

export async function insertEmployee(input: EmployeeWriteInput): Promise<void> {
  await createEmployeeData(supabase, input)
}

export async function updateEmployee(id: string, input: EmployeeWriteInput): Promise<void> {
  return updateEmployeeData(supabase, id, input)
}

export async function deleteEmployee(id: string): Promise<void> {
  return deleteEmployeeData(supabase, id)
}

export async function uploadEmployeeAvatar(
  employeeId: string,
  file: File | Blob | ArrayBuffer,
  ext = 'jpg'
): Promise<string> {
  return uploadEmployeeAvatarData(supabase, employeeId, file, ext)
}
