'use client'

import { supabase } from '@/lib/supabase'
import {
  createEmployee as createEmployeeData,
  deleteEmployee as deleteEmployeeData,
  detectEmployeesDialect as detectEmployeesDialectData,
  fetchEmployees as fetchEmployeesData,
  updateEmployee as updateEmployeeData,
  uploadEmployeeAvatar as uploadEmployeeAvatarData,
  type CatalogDialect,
  type EmployeeRow,
  type EmployeeWriteInput,
} from '@geemastudio/data'

function db() {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return supabase
}

export async function detectEmployeesDialect(): Promise<CatalogDialect> {
  return detectEmployeesDialectData(db())
}

export async function fetchEmployees(): Promise<EmployeeRow[]> {
  return fetchEmployeesData(db())
}

export const fetchAllEmployees = fetchEmployees

export async function insertEmployee(input: EmployeeWriteInput): Promise<EmployeeRow> {
  return createEmployeeData(db(), input)
}

export async function updateEmployee(id: string, input: EmployeeWriteInput): Promise<void> {
  return updateEmployeeData(db(), id, input)
}

export async function deleteEmployee(id: string): Promise<void> {
  return deleteEmployeeData(db(), id)
}

export async function uploadEmployeeAvatar(employeeId: string, file: File): Promise<string> {
  return uploadEmployeeAvatarData(db(), employeeId, file)
}

const AVATAR_BUCKET = 'employee-avatars'

export async function deleteAvatarIfStorage(publicUrl: string | null | undefined): Promise<void> {
  if (!supabase || !publicUrl?.trim()) return
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`
  const i = publicUrl.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(publicUrl.slice(i + marker.length).split('?')[0] ?? '')
  if (!path) return
  await supabase.storage.from(AVATAR_BUCKET).remove([path])
}
