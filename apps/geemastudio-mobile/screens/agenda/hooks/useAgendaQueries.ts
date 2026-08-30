import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useActiveEmployees } from '@/screens/personal/hooks/useEmployeesData'

import type { AgendaAppointment, AgendaService, AgendaServiceCategory } from '../types'

export function useAgendaQueries() {
  const {
    data: appointments = [],
    isLoading,
    refetch,
  } = useQuery<AgendaAppointment[]>({
    queryKey: ['appointments'],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(
          'id, client_name, client_phone, client_document, date, duration, price, status, employee_id, service_id'
        )
        .order('date', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as AgendaAppointment[]
    },
  })

  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
  } = useActiveEmployees()

  const { data: categories = [] } = useQuery<AgendaServiceCategory[]>({
    queryKey: ['service_categories'],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name, order')
        .order('order', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as AgendaServiceCategory[]
    },
  })

  const {
    data: services = [],
    isLoading: servicesLoading,
    error: servicesError,
  } = useQuery<AgendaService[]>({
    queryKey: ['services'],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, duration, category_id')
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as AgendaService[]
    },
  })

  return {
    appointments,
    isLoading,
    refetch,
    employees,
    employeesLoading,
    employeesError,
    categories,
    services,
    servicesLoading,
    servicesError,
  }
}

export function useServicesByCategory(services: AgendaService[], categoryId: string) {
  return useMemo(() => {
    if (!categoryId) return []
    return services.filter((s) => s.category_id === categoryId)
  }, [services, categoryId])
}
