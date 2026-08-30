import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { detectCatalogDialect } from '@/screens/services/lib/catalogAdapter'

import { fetchAllEmployees, type EmployeeRow } from '../lib/employeesAdapter'

export const EMPLOYEES_QUERY_KEY = ['employees'] as const

export function useEmployeesDialect() {
  return useQuery({
    queryKey: ['catalog-dialect'],
    queryFn: detectCatalogDialect,
    staleTime: Infinity,
  })
}

/** Lista completa (activas + inactivas). Fuente única para agenda, personal y finanzas. */
export function useEmployeesQuery(options?: { enabled?: boolean; staleTime?: number }) {
  return useQuery<EmployeeRow[]>({
    queryKey: EMPLOYEES_QUERY_KEY,
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 60_000,
    refetchOnWindowFocus: false,
    queryFn: fetchAllEmployees,
  })
}

/** Chicas activas → columnas de agenda, picker de cita y Asignar. */
export function useActiveEmployees(options?: { enabled?: boolean; staleTime?: number }) {
  const query = useEmployeesQuery(options)
  const employees = useMemo(
    () => (query.data ?? []).filter((e) => e.is_active),
    [query.data]
  )
  return { ...query, data: employees, employees }
}
