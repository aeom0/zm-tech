import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useActiveEmployees } from '@/screens/personal/hooks/useEmployeesData'
import { detectCatalogDialect, rowToPack, type PackRawRow } from '@/screens/services/lib/catalogAdapter'

import type {
  AgendaAppointment,
  AgendaAppointmentServiceLine,
  AgendaPack,
  AgendaPayment,
  AgendaService,
  AgendaServiceCategory,
} from '../types'

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
          'id, client_name, client_phone, client_document, date, duration, price, status, employee_id, service_id, reference_image_paths, reference_received_at, reference_reviewed_at'
        )
        .order('date', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as AgendaAppointment[]
    },
  })

  const { employees, isLoading: employeesLoading, error: employeesError } = useActiveEmployees()

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
    queryKey: ['agenda_services'],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, duration, category_id, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as AgendaService[]
    },
  })

  const {
    data: packs = [],
    isLoading: packsLoading,
    error: packsError,
  } = useQuery<AgendaPack[]>({
    queryKey: ['agenda_packs'],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const dialect = await detectCatalogDialect()
      const { data, error } =
        dialect === 'zm'
          ? await supabase
              .from('packs')
              .select('id, title, description, pack_price, service_ids, is_active')
              .eq('is_active', true)
              .order('title', { ascending: true })
          : await supabase
              .from('packs')
              .select('id, name, description, price, service_ids, is_active')
              .eq('is_active', true)
              .order('name', { ascending: true })
      if (error) throw new Error(error.message)
      return ((data ?? []) as PackRawRow[]).map((row) => rowToPack(row, dialect)) as AgendaPack[]
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
    packs,
    packsLoading,
    packsError,
  }
}

export function useServicesByCategory(services: AgendaService[], categoryId: string) {
  return useMemo(() => {
    if (!categoryId) return []
    return services.filter((s) => s.category_id === categoryId)
  }, [services, categoryId])
}

/**
 * Pagos (`payments`) de una cita puntual — se consulta solo al abrir el detalle, para
 * evaluar el gate de abono/pago pendiente del flujo "marcar completada" (mismo patrón
 * que useAppointmentServiceLinesQuery, scoped a un solo appointment_id).
 */
export function useAppointmentPaymentsQuery(appointmentId: string | null) {
  return useQuery<AgendaPayment[]>({
    queryKey: ['agenda_payments', appointmentId],
    enabled: !!appointmentId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('appointment_id, amount, is_abono')
        .eq('appointment_id', appointmentId as string)
      if (error) throw new Error(error.message)
      return (data ?? []) as AgendaPayment[]
    },
  })
}

/** Líneas de `appointment_services` de una cita puntual (se consulta al abrir el detalle). */
export function useAppointmentServiceLinesQuery(appointmentId: string | null) {
  return useQuery<AgendaAppointmentServiceLine[]>({
    queryKey: ['appointment_services', appointmentId],
    enabled: !!appointmentId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_services')
        .select('id, appointment_id, service_id, employee_id, pack_id, price, duration')
        .eq('appointment_id', appointmentId as string)
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as AgendaAppointmentServiceLine[]
    },
  })
}
