import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useEmployeesQuery } from '@/screens/personal/hooks/useEmployeesData'
import type { PendingAppointment, VerificationAction } from '../types'

export function useValidacionData() {
  const { userId } = useAuth()
  const { config } = useTenant()
  const queryClient = useQueryClient()

  const { data: employees = [] } = useEmployeesQuery({ staleTime: 5 * 60_000 })

  const { data: services = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['validacion_services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('id, name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  // Citas pendientes de validación
  const {
    data: rawPending = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<PendingAppointment[]>({
    queryKey: ['validacion_pagos_pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_name, date, price, service_id, employee_id, notes')
        .eq('status', 'payment_submitted')
        .order('date', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as PendingAppointment[]
    },
    refetchInterval: 30_000,
  })

  // Enriquecer con nombres en memoria
  const employeeById = Object.fromEntries(employees.map((e) => [e.id, e]))
  const serviceById = Object.fromEntries(services.map((s) => [s.id, s]))

  const pending: PendingAppointment[] = rawPending.map((apt) => ({
    ...apt,
    serviceName: apt.service_id ? (serviceById[apt.service_id]?.name ?? '—') : '—',
    employeeName: apt.employee_id ? (employeeById[apt.employee_id]?.name ?? '—') : 'Sin asignar',
    employeeColor: apt.employee_id
      ? (employeeById[apt.employee_id]?.color ?? undefined)
      : undefined,
  }))

  // Mutación: aprobar o rechazar una cita — per-row
  const verifyMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      action,
    }: {
      appointmentId: string
      action: VerificationAction
    }) => {
      // 1. Registrar en appointment_verifications
      const { error: verifyError } = await supabase.from('appointment_verifications').insert({
        appointment_id: appointmentId,
        verified_by: userId!,
        action,
      })
      if (verifyError) throw new Error(verifyError.message)

      // 2. Actualizar status en appointments
      const newStatus = action === 'approved' ? 'completed' : 'cancelled'
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)
      if (updateError) throw new Error(updateError.message)
    },
    onSuccess: () => {
      // Invalida badges Y la lista de pendientes
      queryClient.invalidateQueries({ queryKey: ['validacion_pagos_pending'] })
      queryClient.invalidateQueries({
        queryKey: ['badges', 'payment_submitted'],
      })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })

  return {
    pending,
    isLoading,
    isError,
    refetch,
    verifyMutation,
    config,
  }
}
